import type { FirebaseError } from "firebase/app";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

const PROFILE_KEY = "word-chain.profile.name";

function sanitizeName(raw) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ");
}

function mapAuthError(error: unknown) {
  const firebaseError = error as FirebaseError;
  const code = firebaseError?.code || "";

  if (
    code === "auth/configuration-not-found" ||
    code === "auth/operation-not-allowed"
  ) {
    return "Firebase Auth chua bat Anonymous. Vao Firebase Console > Authentication > Sign-in method > bat Anonymous.";
  }

  if (code === "auth/invalid-api-key") {
    return "Firebase API key khong hop le. Kiem tra lai NUXT_PUBLIC_FIREBASE_API_KEY.";
  }

  if (code === "auth/network-request-failed") {
    return "Khong ket noi duoc Firebase Auth. Kiem tra mang va thu lai.";
  }

  if (code === "auth/app-not-authorized") {
    return "Domain hien tai chua duoc uy quyen. Kiem tra Authorized domains trong Firebase Auth.";
  }

  return "Khong the khoi tao profile tu Firebase Auth.";
}

export function useProfile() {
  const { auth } = useFirebaseClient();

  const uid = useState("profile.uid", () => "");
  const name = useState("profile.name", () => "");
  const profileReady = useState("profile.ready", () => false);
  const profileError = useState("profile.error", () => "");

  function validateName(input) {
    const cleaned = sanitizeName(input);
    if (cleaned.length < 2 || cleaned.length > 24) {
      return "Ten phai tu 2 den 24 ky tu";
    }
    return "";
  }

  async function ensureIdentity() {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    uid.value = auth.currentUser?.uid || "";

    if (uid.value) {
      return uid.value;
    }

    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        uid.value = user?.uid || uid.value;
        unsub();
        resolve(uid.value);
      });
    });
  }

  async function bootstrapProfile() {
    profileError.value = "";

    try {
      await ensureIdentity();

      if (import.meta.client) {
        const cached = localStorage.getItem(PROFILE_KEY) || "";
        name.value = sanitizeName(cached);
      }

      profileReady.value = true;
    } catch (error) {
      profileError.value = mapAuthError(error);
      console.error("Profile bootstrap failed", error);
      profileReady.value = true;
    }
  }

  function saveName(input) {
    const cleaned = sanitizeName(input);
    const error = validateName(cleaned);
    if (error) return error;

    name.value = cleaned;
    if (import.meta.client) {
      localStorage.setItem(PROFILE_KEY, cleaned);
    }
    return "";
  }

  const hasName = computed(() => Boolean(name.value));

  return {
    uid,
    name,
    hasName,
    profileReady,
    profileError,
    validateName,
    bootstrapProfile,
    saveName,
  };
}
