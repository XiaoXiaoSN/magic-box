import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, signInWithPopup } from 'firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  runTransaction,
} from 'firebase/firestore/lite';
import { firebaseApp } from '../../firebaseApp';
import {
  type Config,
  decodeConfig,
  encodePortableConfig,
  type SavedConfig,
} from './config';

// Feedback uses an in-memory anonymous session on the default app.
const app = initializeApp(firebaseApp.options, 'settings');
export const account = getAuth(app);
const db = getFirestore(app);

export async function signIn(): Promise<void> {
  await signInWithPopup(account, new GoogleAuthProvider());
}

export async function readBackup(uid: string): Promise<SavedConfig | null> {
  const snapshot = await getDoc(doc(db, 'userSettings', uid));
  return snapshot.exists() ? decodeConfig(snapshot.data()) : null;
}

export async function saveBackup(
  uid: string,
  config: Config,
  expectedRevision: number,
): Promise<{
  conflict: boolean;
  backup: SavedConfig | null;
}> {
  const ref = doc(db, 'userSettings', uid);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const stored = snapshot.data();
    const current = stored ? decodeConfig(stored) : null;
    if ((current?.revision ?? 0) !== expectedRevision) {
      return { conflict: true, backup: current };
    }
    const revision = expectedRevision + 1;
    // An older client may not know about tools added on another device.
    const settings = {
      ...config.settings,
      boxes: { ...stored?.settings.boxes, ...config.settings.boxes },
    };
    transaction.set(ref, {
      ...encodePortableConfig({ ...config, settings }),
      revision,
    });
    return { conflict: false, backup: { config, revision } };
  });
}
