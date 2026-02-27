import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitKey } from '@/shared/lib/rate-limit';

type CheckStatus = 'pass' | 'fail' | 'warn' | 'skipped';

interface HealthCheck {
  name: string;
  status: CheckStatus;
  details?: string;
  latencyMs?: number;
}

function summarizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 180);
  }
  return 'Unknown error';
}

function buildEnvCheck(name: string, envKeys: string[], required: boolean): HealthCheck {
  const missing = envKeys.filter((key) => !process.env[key]?.trim());
  if (missing.length === 0) {
    return { name, status: 'pass' };
  }

  return {
    name,
    status: required ? 'fail' : 'warn',
    details: `Missing env: ${missing.join(', ')}`,
  };
}

async function checkFirebaseAdmin(): Promise<HealthCheck> {
  const hasAdminCredentials = Boolean(
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON ||
      (
        process.env.FIREBASE_ADMIN_PROJECT_ID &&
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
        process.env.FIREBASE_ADMIN_PRIVATE_KEY
      )
  );

  if (!hasAdminCredentials) {
    return {
      name: 'firebase_admin',
      status: 'warn',
      details: 'Admin credentials are not configured; skipping Firestore ping.',
    };
  }

  const start = Date.now();
  try {
    const { getAdminDb } = await import('@/lib/firebase-admin');
    await getAdminDb().doc('_meta/health').get();
    return {
      name: 'firebase_admin',
      status: 'pass',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'firebase_admin',
      status: 'fail',
      details: summarizeError(error),
      latencyMs: Date.now() - start,
    };
  }
}

function evaluateOverallStatus(checks: HealthCheck[]): 'ok' | 'degraded' {
  return checks.some((check) => check.status === 'fail') ? 'degraded' : 'ok';
}

async function buildHealthPayload() {
  const checks: HealthCheck[] = [
    buildEnvCheck(
      'firebase_client_env',
      [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'NEXT_PUBLIC_FIREBASE_APP_ID',
      ],
      true
    ),
    buildEnvCheck(
      'stripe_env',
      [
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
      ],
      true
    ),
    await checkFirebaseAdmin(),
  ];

  const status = evaluateOverallStatus(checks);
  return {
    status,
    timestamp: new Date().toISOString(),
    service: 'crush-web',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    uptimeSeconds: Math.floor(process.uptime()),
    checks,
  };
}

/**
 * Public uptime endpoint for synthetic monitoring.
 */
export async function GET(request: NextRequest) {
  const rlKey = getRateLimitKey(request, 'health');
  const rl = await checkRateLimit(rlKey, { limit: 120, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json(
      { status: 'degraded', error: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const payload = await buildHealthPayload();
  const httpStatus = payload.status === 'ok' ? 200 : 503;

  return NextResponse.json(payload, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function HEAD(request: NextRequest) {
  const response = await GET(request);
  return new NextResponse(null, {
    status: response.status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
