import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

export function usePresence() {
  const { db } = useFirebaseClient();
  const presenceError = useState("presence.error", () => "");

  let roomSlug = "";
  let uid = "";
  let ticker: ReturnType<typeof window.setInterval> | null = null;
  let started = false;

  async function setOnlineState(online: boolean) {
    if (!roomSlug || !uid) return;

    const memberRef = doc(db, "rooms", roomSlug, "members", uid);
    const payload = {
      isOnline: online,
      lastSeenAt: serverTimestamp(),
    };

    try {
      await setDoc(memberRef, payload, { merge: true });
      presenceError.value = "";
    } catch (setError) {
      try {
        await updateDoc(memberRef, payload);
        presenceError.value = "";
      } catch {
        presenceError.value = `Presence update failed: ${String(setError)}`;
      }
    }
  }

  const onVisibilityChange = () => {
    if (document.hidden) {
      setOnlineState(false);
      return;
    }
    setOnlineState(true);
  };

  const onPageHide = () => {
    setOnlineState(false);
  };

  function startPresence({
    slug,
    profileUid,
  }: {
    slug: string;
    profileUid: string;
  }) {
    if (started) return;

    roomSlug = slug;
    uid = profileUid;
    started = true;

    setOnlineState(true);
    ticker = window.setInterval(() => {
      setOnlineState(true);
    }, 20000);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);
  }

  async function stopPresence() {
    if (!started) return;

    started = false;
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("beforeunload", onPageHide);

    if (ticker) {
      clearInterval(ticker);
      ticker = null;
    }

    await setOnlineState(false);
  }

  return {
    startPresence,
    stopPresence,
    presenceError,
  };
}
