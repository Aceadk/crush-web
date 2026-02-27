import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';

const USERS_COLLECTION = 'users';
const DEVICE_ID_STORAGE_KEY = 'crush.device.id';
const MAX_TRUSTED_DEVICES = 10;
const TOUCH_COOLDOWN_MS = 5 * 60 * 1000;

export interface TrustedDevice {
  deviceId: string;
  deviceName: string;
  userAgent: string;
  platform: string;
  locale: string;
  timezone: string;
  addedAt: string;
  lastUsedAt: string;
}

export interface DeviceTrustResult {
  trusted: boolean;
  currentDeviceId: string;
  trustedDevices: TrustedDevice[];
}

class DeviceSecurityService {
  private timestampToString(value: unknown): string {
    if (!value) return new Date().toISOString();
    if (value instanceof Timestamp) return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'object' && value && 'seconds' in value) {
      const ts = value as { seconds: number };
      return new Date(ts.seconds * 1000).toISOString();
    }
    return new Date().toISOString();
  }

  private mapTrustedDevices(raw: unknown): TrustedDevice[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((entry): TrustedDevice | null => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const candidate = entry as Partial<TrustedDevice> & {
          addedAt?: unknown;
          lastUsedAt?: unknown;
        };

        if (!candidate.deviceId || typeof candidate.deviceId !== 'string') {
          return null;
        }

        return {
          deviceId: candidate.deviceId,
          deviceName:
            typeof candidate.deviceName === 'string' && candidate.deviceName.trim().length > 0
              ? candidate.deviceName
              : 'Unknown device',
          userAgent: typeof candidate.userAgent === 'string' ? candidate.userAgent : '',
          platform: typeof candidate.platform === 'string' ? candidate.platform : 'Unknown',
          locale: typeof candidate.locale === 'string' ? candidate.locale : 'en-US',
          timezone: typeof candidate.timezone === 'string' ? candidate.timezone : 'UTC',
          addedAt: this.timestampToString(candidate.addedAt),
          lastUsedAt: this.timestampToString(candidate.lastUsedAt),
        };
      })
      .filter((entry): entry is TrustedDevice => Boolean(entry));
  }

  private getNavigatorInfo() {
    if (typeof navigator === 'undefined') {
      return {
        userAgent: 'Unknown',
        platform: 'Unknown',
        locale: 'en-US',
      };
    }

    return {
      userAgent: navigator.userAgent || 'Unknown',
      platform: navigator.platform || 'Unknown',
      locale: navigator.language || 'en-US',
    };
  }

  private getTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }

  private buildDeviceName(platform: string, timezone: string): string {
    const compactPlatform = platform.trim() || 'Browser';
    return `${compactPlatform} - ${timezone}`;
  }

  getOrCreateCurrentDeviceId(): string {
    if (typeof window === 'undefined') {
      return 'server-device';
    }

    const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && existing.trim().length > 0) {
      return existing;
    }

    const nextId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, nextId);
    return nextId;
  }

  getCurrentDeviceSnapshot(): TrustedDevice {
    const nowIso = new Date().toISOString();
    const { userAgent, platform, locale } = this.getNavigatorInfo();
    const timezone = this.getTimezone();

    return {
      deviceId: this.getOrCreateCurrentDeviceId(),
      deviceName: this.buildDeviceName(platform, timezone),
      userAgent,
      platform,
      locale,
      timezone,
      addedAt: nowIso,
      lastUsedAt: nowIso,
    };
  }

  async getTrustedDevices(userId: string): Promise<TrustedDevice[]> {
    const db = getFirebaseDb();
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return [];
    }

    const data = userSnap.data();
    const security = (data.security as Record<string, unknown> | undefined) ?? {};
    return this.mapTrustedDevices(security.trustedDevices);
  }

  private async saveTrustedDevices(userId: string, trustedDevices: TrustedDevice[]): Promise<void> {
    const db = getFirebaseDb();
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User profile not found');
    }

    const existingSecurity = (userSnap.data().security as Record<string, unknown> | undefined) ?? {};

    await updateDoc(userRef, {
      security: {
        ...existingSecurity,
        trustedDevices,
      },
      updatedAt: serverTimestamp(),
    });
  }

  private async touchTrustedDevice(
    userId: string,
    trustedDevices: TrustedDevice[],
    currentDevice: TrustedDevice
  ): Promise<TrustedDevice[]> {
    const existing = trustedDevices.find((device) => device.deviceId === currentDevice.deviceId);
    if (!existing) {
      return trustedDevices;
    }

    const lastUsedMs = Date.parse(existing.lastUsedAt);
    if (!Number.isNaN(lastUsedMs) && Date.now() - lastUsedMs < TOUCH_COOLDOWN_MS) {
      return trustedDevices;
    }

    const nowIso = new Date().toISOString();
    const updatedDevices = trustedDevices.map((device) =>
      device.deviceId === currentDevice.deviceId
        ? {
            ...device,
            deviceName: currentDevice.deviceName,
            userAgent: currentDevice.userAgent,
            platform: currentDevice.platform,
            locale: currentDevice.locale,
            timezone: currentDevice.timezone,
            lastUsedAt: nowIso,
          }
        : device
    );

    await this.saveTrustedDevices(userId, updatedDevices);
    return updatedDevices;
  }

  async evaluateCurrentDeviceTrust(userId: string): Promise<DeviceTrustResult> {
    const currentDevice = this.getCurrentDeviceSnapshot();
    const trustedDevices = await this.getTrustedDevices(userId);
    const isTrusted = trustedDevices.some((device) => device.deviceId === currentDevice.deviceId);

    if (!isTrusted) {
      return {
        trusted: false,
        currentDeviceId: currentDevice.deviceId,
        trustedDevices,
      };
    }

    const updatedDevices = await this.touchTrustedDevice(userId, trustedDevices, currentDevice);
    return {
      trusted: true,
      currentDeviceId: currentDevice.deviceId,
      trustedDevices: updatedDevices,
    };
  }

  async trustCurrentDevice(userId: string): Promise<DeviceTrustResult> {
    const currentDevice = this.getCurrentDeviceSnapshot();
    const trustedDevices = await this.getTrustedDevices(userId);
    const nowIso = new Date().toISOString();

    let nextTrustedDevices: TrustedDevice[];
    const existing = trustedDevices.find((device) => device.deviceId === currentDevice.deviceId);

    if (existing) {
      nextTrustedDevices = trustedDevices.map((device) =>
        device.deviceId === currentDevice.deviceId
          ? {
              ...device,
              deviceName: currentDevice.deviceName,
              userAgent: currentDevice.userAgent,
              platform: currentDevice.platform,
              locale: currentDevice.locale,
              timezone: currentDevice.timezone,
              lastUsedAt: nowIso,
            }
          : device
      );
    } else {
      const nextDevice: TrustedDevice = {
        ...currentDevice,
        addedAt: nowIso,
        lastUsedAt: nowIso,
      };
      nextTrustedDevices = [nextDevice, ...trustedDevices].slice(0, MAX_TRUSTED_DEVICES);
    }

    await this.saveTrustedDevices(userId, nextTrustedDevices);

    return {
      trusted: true,
      currentDeviceId: currentDevice.deviceId,
      trustedDevices: nextTrustedDevices,
    };
  }

  async revokeTrustedDevice(userId: string, deviceId: string): Promise<TrustedDevice[]> {
    const trustedDevices = await this.getTrustedDevices(userId);
    const nextTrustedDevices = trustedDevices.filter((device) => device.deviceId !== deviceId);
    await this.saveTrustedDevices(userId, nextTrustedDevices);
    return nextTrustedDevices;
  }
}

export const deviceSecurityService = new DeviceSecurityService();
