'use client';

/**
 * Chat Settings — message retention. Web counterpart of the mobile
 * `chat_settings_screen.dart`, so the same account sees the same retention
 * choice and copy on both platforms.
 *
 * Retention is server-owned: the `updateChatSettings` callable writes
 * `profile.chatSettings.extendedRetention` plus the RTDB mirror, and the
 * backend resolves the actual window (free: 1h default / 24h extended; Plus:
 * 7 days regardless of the flag). This page therefore never computes retention
 * itself — it reflects what the server reports back.
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { callables, useAuthStore, useUIStore } from '@crush/core';
import { Badge, Card, cn } from '@crush/ui';
import { ArrowLeft, Check, Clock, Info, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';

// Mirrors functions/src/index.ts RETENTION_* constants. Display only — the
// server remains authoritative for what is actually applied.
const RETENTION_FREE_DEFAULT_HOURS = 1;
const RETENTION_FREE_EXTENDED_HOURS = 24;
const RETENTION_PLUS_HOURS = 168;

function formatRetention(hours: number): string {
  if (hours >= 24) {
    const days = Math.round(hours / 24);
    return days === 1 ? '1 day' : `${days} days`;
  }
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

export default function ChatSettingsPage() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuthStore();
  const { addToast } = useUIStore();

  const isPremium = profile?.isPremium ?? false;
  const [extendedRetention, setExtendedRetention] = useState(
    profile?.chatSettings?.extendedRetention ?? false
  );
  const [saving, setSaving] = useState(false);

  // Plus overrides the toggle entirely, so show the plan's window rather than
  // implying the free choice still governs.
  const effectiveHours = isPremium
    ? RETENTION_PLUS_HOURS
    : extendedRetention
      ? RETENTION_FREE_EXTENDED_HOURS
      : RETENTION_FREE_DEFAULT_HOURS;

  const applyRetention = useCallback(
    async (next: boolean) => {
      if (saving || next === extendedRetention) return;
      const previous = extendedRetention;
      setExtendedRetention(next); // optimistic
      setSaving(true);
      try {
        const result = await callables.updateChatSettings({ extendedRetention: next });
        // Trust the server's echo over local state.
        setExtendedRetention(result.extendedRetention);
        await refreshProfile?.();
        addToast({
          type: 'success',
          title: 'Retention updated',
          description: result.message,
        });
      } catch {
        setExtendedRetention(previous); // rollback
        addToast({
          type: 'error',
          title: 'Could not update retention',
          description: 'Please check your connection and try again.',
        });
      } finally {
        setSaving(false);
      }
    },
    [addToast, extendedRetention, refreshProfile, saving]
  );

  const options = [
    {
      value: false,
      title: 'Standard',
      description: `Messages are deleted ${RETENTION_FREE_DEFAULT_HOURS} hour after being read`,
    },
    {
      value: true,
      title: 'Extended',
      description: `Messages are deleted ${RETENTION_FREE_EXTENDED_HOURS} hours after being read`,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">Chat Settings</h1>
          <p className="text-sm text-muted-foreground">Message retention &amp; auto-delete</p>
        </div>
      </div>

      {/* Current state */}
      <Card className="mb-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Current retention</p>
            <p className="font-semibold">{formatRetention(effectiveHours)} after being read</p>
          </div>
          {isPremium && <Badge variant="premium">Plus Benefit</Badge>}
        </div>
      </Card>

      {/* Retention choice */}
      <Card className="mb-4 overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Message Retention
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Control how long your messages are kept after being read.
          </p>
        </div>

        {isPremium ? (
          <div className="p-4">
            <p className="text-sm">
              Your Plus plan keeps messages for {formatRetention(RETENTION_PLUS_HOURS)} after they
              are read. This applies automatically on every device.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {options.map((option) => {
              const selected = extendedRetention === option.value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => void applyRetention(option.value)}
                  disabled={saving}
                  aria-pressed={selected}
                  className={cn(
                    'flex w-full items-center gap-3 p-4 text-left transition-colors',
                    selected ? 'bg-primary/5' : 'hover:bg-muted/60',
                    saving && 'cursor-not-allowed opacity-70'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                      selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                    )}
                  >
                    {saving && selected ? (
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                    ) : (
                      selected && <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{option.title}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Upsell */}
      {!isPremium && (
        <Card className="mb-4 border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10">
          <Link href="/premium" className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Want more time?</p>
              <p className="text-sm text-muted-foreground">
                Upgrade to Plus to keep messages for up to 7 days.
              </p>
            </div>
          </Link>
        </Card>
      )}

      {/* How it works */}
      <Card className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">How it works</h2>
        </div>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>Messages are deleted after being read, based on your retention setting.</li>
          <li>Unread messages are kept until they are read.</li>
          <li>Deleted messages cannot be recovered.</li>
          <li>This setting applies to your account on every device.</li>
        </ul>
      </Card>
    </div>
  );
}
