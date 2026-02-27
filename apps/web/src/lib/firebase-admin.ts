import 'server-only';

import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

interface ServiceAccountLike {
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

function buildAdminCredentials() {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    '\n'
  );
  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    const parsed = JSON.parse(serviceAccountJson) as ServiceAccountLike;
    if (parsed.project_id && parsed.client_email && parsed.private_key) {
      return cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, '\n'),
      });
    }
  }

  if (projectId && clientEmail && privateKey) {
    return cert({
      projectId,
      clientEmail,
      privateKey,
    });
  }

  throw new Error(
    'Firebase Admin credentials are not configured. Set FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON or FIREBASE_ADMIN_PROJECT_ID/FIREBASE_ADMIN_CLIENT_EMAIL/FIREBASE_ADMIN_PRIVATE_KEY.'
  );
}

function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  adminApp = initializeApp({
    credential: buildAdminCredentials(),
  });
  return adminApp;
}

export function getAdminDb(): Firestore {
  if (adminDb) {
    return adminDb;
  }
  adminDb = getFirestore(getAdminApp());
  return adminDb;
}
