import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from '@playwright/test';
import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const webRoot = process.cwd();
const envPath = path.join(webRoot, '.env.local');
const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

function loadEnv(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function poll(description, operation, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await operation();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(
    `${description} timed out${lastError instanceof Error ? `: ${lastError.message}` : ''}`
  );
}

async function fillStable(locator, value, label) {
  await poll(`${label} input hydration`, async () => {
    await locator.fill(value);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return (await locator.inputValue()) === value;
  }, 15_000);
}

function trustedDevice(deviceId) {
  const now = new Date().toISOString();
  return {
    deviceId,
    deviceName: 'Codex smoke browser',
    userAgent: 'Codex cross-client smoke',
    platform: 'Playwright',
    locale: 'en-US',
    timezone: 'UTC',
    addedAt: now,
    lastUsedAt: now,
  };
}

function completeProfile({
  uid,
  email,
  phoneNumber,
  name,
  gender,
  interestedIn,
  photoUrl,
  deviceId,
}) {
  const now = FieldValue.serverTimestamp();
  return {
    id: uid,
    email,
    phoneNumber,
    displayName: name,
    photos: [photoUrl],
    profilePhotoUrl: photoUrl,
    location: {
      city: 'Kathmandu',
      country: 'NP',
      latitude: 27.7172,
      longitude: 85.324,
    },
    interestedIn,
    settings: {
      showInDiscovery: true,
      incognitoMode: false,
      ageRangeMin: 18,
      ageRangeMax: 60,
      maxDistance: 500,
      showAge: true,
      showDistance: true,
    },
    subscriptionTier: 'free',
    status: 'active',
    moderationStatus: 'active',
    hasAcceptedTerms: true,
    onboardingComplete: true,
    profileComplete: true,
    isEmailVerified: true,
    emailVerified: true,
    isPhoneVerified: true,
    isOnline: true,
    security: { trustedDevices: [trustedDevice(deviceId)] },
    profile: {
      name,
      birthDate: gender === 'female' ? '1998-05-10' : '1997-04-12',
      age: gender === 'female' ? 28 : 29,
      gender,
      sexualOrientation: 'straight',
      bio: 'Cross-client production smoke profile for web and mobile parity.',
      photoUrls: [photoUrl],
      primaryPhotoIndex: 0,
      interests: ['Coffee', 'Music', 'Travel'],
      city: 'Kathmandu',
      country: 'NP',
      latitude: 27.7172,
      longitude: 85.324,
      isVerified: false,
      preferences: {
        minAge: 18,
        maxAge: 60,
        maxDistanceKm: 500,
        showMeGenders: interestedIn,
        showMyDistance: true,
        showMyAge: true,
        hideFromDiscovery: false,
        incognitoMode: false,
      },
    },
    createdAt: now,
    updatedAt: now,
    lastActive: now,
  };
}

async function exchangeCustomToken(auth, apiKey, uid) {
  const customToken = await auth.createCustomToken(uid);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const body = await response.json();
  assert(response.ok && body.idToken, `Custom-token exchange failed (${response.status})`);
  return body.idToken;
}

async function callCallable(projectId, name, idToken, appCheckToken, data) {
  const response = await fetch(
    `https://us-central1-${projectId}.cloudfunctions.net/${name}`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${idToken}`,
        'x-firebase-appcheck': appCheckToken,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ data }),
    }
  );
  const body = await response.json();
  assert(response.ok, `${name} failed (${response.status}): ${JSON.stringify(body.error ?? body)}`);
  return body.result;
}

function candidateIds(deck) {
  return Array.isArray(deck?.candidates)
    ? deck.candidates.map((candidate) => candidate?.id ?? candidate?.userId)
    : [];
}

async function cleanupStaleSmokeData(auth, db, bucket) {
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    const staleUsers = page.users.filter((user) =>
      user.email?.startsWith('codex.web.') || user.email?.startsWith('codex.mobile.')
    );
    for (const user of staleUsers) {
      await db.recursiveDelete(db.collection('users').doc(user.uid)).catch(() => undefined);
      await auth.deleteUser(user.uid).catch(() => undefined);
    }
    pageToken = page.pageToken;
  } while (pageToken);

  const matchRefs = await db.collection('matches').listDocuments();
  for (const matchRef of matchRefs) {
    if (matchRef.id.startsWith('codex-smoke-')) {
      await db.recursiveDelete(matchRef).catch(() => undefined);
    }
  }

  const [files] = await bucket.getFiles({ prefix: 'chat_media/codex-smoke-' });
  await Promise.all(files.map((file) => file.delete({ ignoreNotFound: true })));
}

async function login(page, email, password) {
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
}

loadEnv(envPath);
const serviceAccountRaw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
assert(serviceAccountRaw, 'FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is missing');
assert(apiKey, 'NEXT_PUBLIC_FIREBASE_API_KEY is missing');
assert(projectId, 'NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing');
assert(storageBucket, 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is missing');
assert(appId, 'NEXT_PUBLIC_FIREBASE_APP_ID is missing');

const adminApp = initializeApp({
  credential: cert(JSON.parse(serviceAccountRaw)),
  projectId,
  storageBucket,
});
const auth = getAuth(adminApp);
const appCheckToken = (await getAppCheck(adminApp).createToken(appId)).token;
const db = getFirestore(adminApp);
const bucket = getStorage(adminApp).bucket();
await cleanupStaleSmokeData(auth, db, bucket);
const browser = await chromium.launch({ headless: true });

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const webEmail = `codex.web.${suffix}@example.com`;
const mobileEmail = `codex.mobile.${suffix}@example.com`;
const password = `Crush!${suffix}Aa1`;
const webDeviceId = `codex-web-${suffix}`;
const mobileDeviceId = `codex-mobile-${suffix}`;
const webName = `Web Smoke ${suffix.slice(-6)}`;
const mobileName = `Mobile Smoke ${suffix.slice(-6)}`;
const phoneTail = String(Date.now()).slice(-7);
const webPhone = `+1555${phoneTail}`;
const mobilePhone = `+1556${phoneTail}`;
const photoUrl = 'https://lh3.googleusercontent.com/a/default-user=s256-c';
const matchId = `codex-smoke-${suffix}`;
let webUid;
let mobileUid;
let mediaPath;

try {
  const signupContext = await browser.newContext();
  const signupPage = await signupContext.newPage();
  signupPage.on('console', (message) => {
    if (message.type() === 'error') {
      console.error(`BROWSER console: ${message.text()}`);
    }
  });
  signupPage.on('pageerror', (error) => {
    console.error(`BROWSER pageerror: ${error.message}`);
  });
  signupPage.on('response', (response) => {
    if (response.status() >= 400) {
      console.error(`BROWSER response: ${response.status()} ${response.url()}`);
    }
  });
  await signupPage.goto(`${baseUrl}/auth/signup`, { waitUntil: 'domcontentloaded' });
  await signupPage.getByRole('button', { name: 'Create Account' }).waitFor();
  // The development server streams the initial page before client hydration.
  // Filling before hydration completes is discarded when React attaches.
  await signupPage.waitForTimeout(10_000);
  const nameInput = signupPage.locator('input[placeholder="Full name"]');
  const emailInput = signupPage.locator('input[type="email"]');
  const passwordInput = signupPage.locator('input[placeholder="Password"]');
  const confirmInput = signupPage.locator('input[placeholder="Confirm password"]');
  await fillStable(nameInput, webName, 'Full name');
  await fillStable(emailInput, webEmail, 'Email');
  await fillStable(passwordInput, password, 'Password');
  await fillStable(confirmInput, password, 'Confirm password');
  await signupPage.waitForTimeout(1_000);
  assert((await nameInput.inputValue()) === webName, 'Full name was reset before submit');
  assert((await emailInput.inputValue()) === webEmail, 'Email was reset before submit');
  assert((await passwordInput.inputValue()) === password, 'Password was reset before submit');
  assert((await confirmInput.inputValue()) === password, 'Confirm password was reset before submit');
  await signupPage.getByRole('button', { name: 'Create Account' }).click();
  try {
    await signupPage.waitForURL(/\/auth\/verify-email/, { timeout: 60_000 });
  } catch (error) {
    const pageText = (await signupPage.locator('body').innerText()).replace(/\s+/g, ' ').trim();
    throw new Error(
      `Web signup did not reach verify-email; current URL=${signupPage.url()}; page=${pageText.slice(0, 600)}`,
      { cause: error }
    );
  }

  const webUser = await poll('Firebase Auth user creation', async () => {
    try {
      return await auth.getUserByEmail(webEmail);
    } catch {
      return null;
    }
  });
  webUid = webUser.uid;
  const signupDoc = await poll('users/{uid} creation from web signup', async () => {
    const snapshot = await db.collection('users').doc(webUid).get();
    return snapshot.exists ? snapshot : null;
  });
  assert(signupDoc.data()?.email === webEmail, 'Signup user document has the wrong email');
  console.log('PASS web signup created Firebase Auth user and users/{uid} document');
  await signupContext.close();

  await auth.updateUser(webUid, {
    emailVerified: true,
    phoneNumber: webPhone,
    displayName: webName,
  });
  await db
    .collection('users')
    .doc(webUid)
    .set(
      completeProfile({
        uid: webUid,
        email: webEmail,
        phoneNumber: webPhone,
        name: webName,
        gender: 'female',
        interestedIn: ['male'],
        photoUrl,
        deviceId: webDeviceId,
      }),
      { merge: true }
    );

  const mobileUser = await auth.createUser({
    email: mobileEmail,
    password,
    emailVerified: true,
    phoneNumber: mobilePhone,
    displayName: mobileName,
  });
  mobileUid = mobileUser.uid;
  await db
    .collection('users')
    .doc(mobileUid)
    .set(
      completeProfile({
        uid: mobileUid,
        email: mobileEmail,
        phoneNumber: mobilePhone,
        name: mobileName,
        gender: 'male',
        interestedIn: ['female'],
        photoUrl,
        deviceId: mobileDeviceId,
      })
    );

  const mobileIdToken = await exchangeCustomToken(auth, apiKey, mobileUid);
  const visibleDeck = await callCallable(
    projectId,
    'fetchDiscoveryCandidates',
    mobileIdToken,
    appCheckToken,
    { limit: 50 }
  );
  assert(
    candidateIds(visibleDeck).includes(webUid),
    'Fresh web account was absent from the mobile discovery callable'
  );
  console.log('PASS mobile discovery callable returned the fresh web account');

  const webContext = await browser.newContext();
  await webContext.addInitScript((deviceId) => {
    window.localStorage.setItem('crush.device.id', deviceId);
  }, webDeviceId);
  const webPage = await webContext.newPage();
  webPage.on('console', (message) => {
    if (message.type() === 'error') {
      console.error(`BROWSER console: ${message.text()}`);
    }
  });
  webPage.on('pageerror', (error) => {
    console.error(`BROWSER pageerror: ${error.message}`);
  });
  const persistedWebDoc = await db.collection('users').doc(webUid).get();
  const persistedDevices = persistedWebDoc.data()?.security?.trustedDevices;
  assert(
    Array.isArray(persistedDevices) && persistedDevices[0]?.deviceId === webDeviceId,
    'Trusted web device was not persisted before login'
  );
  await login(webPage, webEmail, password);
  await webPage.waitForURL(/\/discover(?:\?|$)/, { timeout: 60_000 });
  assert(
    (await webPage.evaluate(() => window.localStorage.getItem('crush.device.id'))) ===
      webDeviceId,
    'Browser device id changed during login'
  );
  await webPage.goto(`${baseUrl}/settings/account`, { waitUntil: 'domcontentloaded' });
  try {
    await webPage.getByRole('heading', { name: 'Account Management' }).waitFor({
      timeout: 30_000,
    });
  } catch (error) {
    const pageText = (await webPage.locator('body').innerText()).replace(/\s+/g, ' ').trim();
    throw new Error(
      `Account settings did not render; current URL=${webPage.url()}; page=${pageText.slice(0, 600)}`,
      { cause: error }
    );
  }
  await webPage.getByRole('button', { name: 'Hide Profile' }).click();
  await webPage.getByText('Profile Hidden').waitFor({ timeout: 30_000 });
  await poll('canonical hideFromDiscovery update', async () => {
    const snapshot = await db.collection('users').doc(webUid).get();
    return snapshot.get('profile.preferences.hideFromDiscovery') === true;
  });

  const hiddenDeck = await poll('mobile deck exclusion after Hide Profile', async () => {
    const deck = await callCallable(
      projectId,
      'fetchDiscoveryCandidates',
      mobileIdToken,
      appCheckToken,
      { limit: 50 }
    );
    return candidateIds(deck).includes(webUid) ? null : deck;
  });
  assert(!candidateIds(hiddenDeck).includes(webUid), 'Hidden web profile remained in mobile deck');
  console.log('PASS Hide Profile removed the web account from the mobile discovery callable');

  await db.collection('matches').doc(matchId).set({
    userIds: [webUid, mobileUid],
    users: [webUid, mobileUid],
    participants: [webUid, mobileUid],
    status: 'active',
    pinnedForUser: { [webUid]: false, [mobileUid]: false },
    preMatchRequests: { [webUid]: 0, [mobileUid]: 0 },
    readBy: {},
    typing: {},
    otherUserName: mobileName,
    otherUserPhotoUrl: photoUrl,
    createdAt: FieldValue.serverTimestamp(),
    lastMessageAt: FieldValue.serverTimestamp(),
    lastMessageContent: '',
    lastMessageType: 'text',
  });

  await webPage.goto(`${baseUrl}/messages/${matchId}`, { waitUntil: 'domcontentloaded' });
  const fileInput = webPage.locator('input[type="file"][accept="image/*"]');
  await fileInput.waitFor({ state: 'attached', timeout: 60_000 });
  await fileInput.setInputFiles({
    name: 'cross-client-smoke.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZJ9sAAAAASUVORK5CYII=',
      'base64'
    ),
  });
  await webPage.getByRole('button', { name: 'Send Photo' }).click();

  const imageMessage = await poll('canonical image message creation', async () => {
    const snapshot = await db
      .collection('matches')
      .doc(matchId)
      .collection('messages')
      .where('type', '==', 'image')
      .limit(1)
      .get();
    return snapshot.empty ? null : snapshot.docs[0];
  }, 60_000);
  const imageData = imageMessage.data();
  assert(imageData.fromUserId === webUid, 'Image message sender is incorrect');
  assert(imageData.toUserId === mobileUid, 'Image message recipient is incorrect');
  assert(typeof imageData.mediaUrl === 'string', 'Image message has no mediaUrl');

  const encodedObject = new URL(imageData.mediaUrl).pathname.split('/o/')[1];
  mediaPath = encodedObject ? decodeURIComponent(encodedObject) : null;
  assert(
    mediaPath?.startsWith(`chat_media/${matchId}/${webUid}/`),
    `Image stored at unexpected path: ${mediaPath}`
  );

  const firestoreRead = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/matches/${matchId}/messages/${imageMessage.id}`,
    { headers: { authorization: `Bearer ${mobileIdToken}` } }
  );
  assert(
    firestoreRead.ok,
    `Mobile account could not read image message (${firestoreRead.status})`
  );
  const mediaRead = await fetch(imageData.mediaUrl);
  assert(mediaRead.ok, `Mobile media URL fetch failed (${mediaRead.status})`);
  console.log('PASS web image upload produced a canonical message readable by mobile account');
  await webContext.close();

  await db.collection('users').doc(mobileUid).set(
    {
      'settings.incognitoMode': true,
      'profile.preferences.incognitoMode': true,
      onboardingComplete: true,
      profileComplete: true,
      hasAcceptedTerms: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const mobileContext = await browser.newContext({
    ...devices['Pixel 5'],
  });
  await mobileContext.addInitScript((deviceId) => {
    window.localStorage.setItem('crush.device.id', deviceId);
  }, mobileDeviceId);
  const mobilePage = await mobileContext.newPage();
  await login(mobilePage, mobileEmail, password);
  await mobilePage.waitForURL(/\/discover(?:\?|$)/, { timeout: 60_000 });
  assert(!mobilePage.url().includes('/onboarding'), 'Incognito mobile user was sent to onboarding');
  console.log('PASS incognito mobile-sized web session landed on /discover, not onboarding');
  await mobileContext.close();
} finally {
  await browser.close();
  if (mediaPath) {
    await bucket.file(mediaPath).delete({ ignoreNotFound: true }).catch(() => undefined);
  }
  await db.collection('matches').doc(matchId).delete().catch(() => undefined);
  for (const uid of [webUid, mobileUid].filter(Boolean)) {
    const messageSnapshot = await db
      .collection('matches')
      .doc(matchId)
      .collection('messages')
      .get()
      .catch(() => null);
    if (messageSnapshot) {
      await Promise.all(messageSnapshot.docs.map((doc) => doc.ref.delete()));
    }
    await db.collection('users').doc(uid).delete().catch(() => undefined);
    await auth.deleteUser(uid).catch(() => undefined);
  }
  await deleteApp(adminApp);
}
