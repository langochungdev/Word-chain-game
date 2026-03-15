import type { Auth } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";
import type { Firestore } from "firebase/firestore";

declare module "#app" {
  interface NuxtApp {
    $firebaseApp: FirebaseApp | null;
    $auth: Auth | null;
    $db: Firestore | null;
  }
}

declare module "vue" {
  interface ComponentCustomProperties {
    $firebaseApp: FirebaseApp | null;
    $auth: Auth | null;
    $db: Firestore | null;
  }
}

export {};
