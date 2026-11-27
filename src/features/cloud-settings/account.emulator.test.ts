import { initializeApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from 'firebase/firestore/lite';
import { expect, it, vi } from 'vitest';
import { DEFAULT_PREFS } from '../../contexts/PreferencesContext';
import { buildDefaultSettings } from '../../contexts/SettingsContext';
import { account, readBackup, saveBackup } from './account';
import { portablePrefs } from './config';

vi.mock('../../firebaseApp', async () => {
  const { initializeApp } = await import('firebase/app');
  return {
    firebaseApp: initializeApp({
      projectId: 'demo-magic-box',
      apiKey: 'emulator',
    }),
  };
});

const host = process.env.FIRESTORE_EMULATOR_HOST;
it.skipIf(!host)(
  'enforces ownership, rejects stale saves and preserves tools unknown to this client',
  async () => {
    const [hostname, port] = (host ?? '').split(':');
    const uid = crypto.randomUUID();
    const db = getFirestore(account.app);
    connectFirestoreEmulator(db, hostname, Number(port), {
      mockUserToken: {
        sub: uid,
        firebase: { sign_in_provider: 'google.com', identities: {} },
      },
    });
    const config = {
      prefs: portablePrefs(DEFAULT_PREFS),
      settings: buildDefaultSettings(),
      locale: 'en' as const,
    };
    expect(await readBackup(uid)).toBeNull();
    const writes = await Promise.all([
      saveBackup(uid, config, 0),
      saveBackup(uid, config, 0),
    ]);
    expect(writes.map((result) => result.conflict).sort()).toEqual([
      false,
      true,
    ]);
    const ref = doc(db, 'userSettings', uid);
    const moreBoxes = {
      ...config.settings.boxes,
      future: { id: 'future', enabled: false, secondaryOrder: 200 },
    };
    await setDoc(ref, {
      ...config,
      settings: { ...config.settings, boxes: moreBoxes },
      version: 1,
      revision: 2,
    });
    expect(await saveBackup(uid, config, 1)).toMatchObject({
      conflict: true,
      backup: { revision: 2 },
    });
    await saveBackup(uid, config, 2);
    expect((await getDoc(ref)).data()?.settings.boxes.future).toEqual(
      moreBoxes.future,
    );
    await expect(
      setDoc(ref, { ...config, version: 1, revision: 1 }),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(readBackup('another-account')).rejects.toMatchObject({
      code: 'permission-denied',
    });
    await expect(
      saveBackup('another-account', config, 0),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(getDoc(doc(db, 'feedback', uid))).rejects.toMatchObject({
      code: 'permission-denied',
    });

    const guest = getFirestore(initializeApp(account.app.options, 'guest'));
    connectFirestoreEmulator(guest, hostname, Number(port));
    await expect(getDoc(doc(guest, 'userSettings', uid))).rejects.toMatchObject(
      { code: 'permission-denied' },
    );
  },
  20000,
);
