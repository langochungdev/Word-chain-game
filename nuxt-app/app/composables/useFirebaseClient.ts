import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

export function useFirebaseClient() {
  const nuxtApp = useNuxtApp();
  const db = nuxtApp.$db as Firestore | null;
  const auth = nuxtApp.$auth as Auth | null;

  if (!db || !auth) {
    throw new Error(
      "Firebase chua duoc cau hinh. Vui long them NUXT_PUBLIC_FIREBASE_* env.",
    );
  }

  return { db, auth };
}
