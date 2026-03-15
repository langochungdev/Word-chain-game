import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import type { Auth } from "firebase/auth";
import { getAuth, signInAnonymously } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig();
  const publicConfig = config.public as {
    firebaseApiKey?: string;
    firebaseAuthDomain?: string;
    firebaseProjectId?: string;
    firebaseAppId?: string;
    firebaseStorageBucket?: string;
    firebaseMessagingSenderId?: string;
  };

  const firebaseConfig: FirebaseOptions = {
    apiKey: publicConfig.firebaseApiKey,
    authDomain: publicConfig.firebaseAuthDomain,
    projectId: publicConfig.firebaseProjectId,
    appId: publicConfig.firebaseAppId,
    storageBucket: publicConfig.firebaseStorageBucket,
    messagingSenderId: publicConfig.firebaseMessagingSenderId,
  };

  let firebaseApp: FirebaseApp | null = null;
  let auth: Auth | null = null;
  let db: Firestore | null = null;

  if (
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  ) {
    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);

    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Firebase anonymous sign-in failed", error);
      }
    }
  }

  return {
    provide: {
      firebaseApp,
      auth,
      db,
    },
  };
});
