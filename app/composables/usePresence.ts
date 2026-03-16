import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

export function usePresence() {
  const { db } = useFirebaseClient();
  const presenceError = useState("presence.error", () => "");

  let roomSlug = "";
  let uid = "";
  let ticker: ReturnType<typeof setInterval> | null = null;
  let started = false;
  let writeQueue: Promise<void> = Promise.resolve();

  function enqueueWrite(task: () => Promise<void>) {
    writeQueue = writeQueue.then(task, task);
    return writeQueue;
  }

  async function setOnlineState(online: boolean) {
    await enqueueWrite(async () => {
      if (!roomSlug || !uid) return;

      const memberRef = doc(db, "rooms", roomSlug, "members", uid);
      const roomRef = doc(db, "rooms", roomSlug);
      const payload = {
        isOnline: online,
        lastSeenAt: serverTimestamp(),
      };

      try {
        await setDoc(memberRef, payload, { merge: true });
        if (online) {
          await updateDoc(roomRef, {
            lastActivityAt: serverTimestamp(),
          });
        }
        presenceError.value = "";
      } catch (setError) {
        try {
          await updateDoc(memberRef, payload);
          if (online) {
            await updateDoc(roomRef, {
              lastActivityAt: serverTimestamp(),
            });
          }
          presenceError.value = "";
        } catch {
          presenceError.value = `Presence update failed: ${String(setError)}`;
        }
      }
    });
  }

  const onVisibilityChange = () => {
    if (document.hidden) {
      void setOnlineState(false);
      return;
    }
    void setOnlineState(true);
  };

  const onPageHide = () => {
    void setOnlineState(false);
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

    void setOnlineState(true);
    ticker = setInterval(() => {
      void setOnlineState(true);
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
    roomSlug = "";
    uid = "";
  }

  return {
    startPresence,
    stopPresence,
    presenceError,
  };
}
