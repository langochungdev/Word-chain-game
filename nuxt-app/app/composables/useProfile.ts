import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

const PROFILE_KEY = "word-chain.profile.name";

function sanitizeName(raw) {
  return String(raw || "").trim().replace(/\s+/g, " ");
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
    } catch {
      profileError.value = "Khong the khoi tao profile";
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
