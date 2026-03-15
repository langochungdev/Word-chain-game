import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const MAX_PLAYERS_CAP = 20;

export function useRoomActions({ db, roomSlug }) {
  async function joinRoom(profile) {
    const roomRef = doc(db, "rooms", roomSlug);
    const memberRef = doc(db, "rooms", roomSlug, "members", profile.uid);

    await runTransaction(db, async (tx) => {
      const roomDoc = await tx.get(roomRef);
      if (!roomDoc.exists()) throw new Error("ROOM_NOT_FOUND");

      const roomData = roomDoc.data();
      if (roomData.status !== "open" && roomData.status !== "playing") {
        throw new Error("ROOM_NOT_OPEN");
      }

      const playerCount = Number(roomData.playerCount || 0);
      const parsedMax = Number(roomData.maxPlayers || 8);
      const maxPlayers = Math.max(1, Math.min(MAX_PLAYERS_CAP, parsedMax || 8));
      const memberDoc = await tx.get(memberRef);
      const isExisting = memberDoc.exists();

      if (!isExisting && playerCount >= maxPlayers) {
        throw new Error("ROOM_FULL");
      }

      tx.set(
        memberRef,
        {
          displayName: profile.name,
          role: roomData.hostUid === profile.uid ? "host" : "player",
          score: Number(memberDoc.data()?.score || 0),
          isOnline: true,
          joinedAt: memberDoc.data()?.joinedAt || serverTimestamp(),
          lastSeenAt: serverTimestamp(),
        },
        { merge: true },
      );

      tx.update(roomRef, {
        playerCount: isExisting ? playerCount : playerCount + 1,
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
      });
    });
  }

  async function sendMessage(profile, text) {
    const content = String(text || "").trim();
    if (!content) throw new Error("MESSAGE_EMPTY");

    const roomRef = doc(db, "rooms", roomSlug);
    const memberRef = doc(db, "rooms", roomSlug, "members", profile.uid);
    const messageRef = doc(collection(db, "rooms", roomSlug, "messages"));

    await runTransaction(db, async (tx) => {
      const roomDoc = await tx.get(roomRef);
      const memberDoc = await tx.get(memberRef);
      if (!roomDoc.exists() || !memberDoc.exists())
        throw new Error("NOT_IN_ROOM");

      const roomData = roomDoc.data();
      const memberData = memberDoc.data();
      const points = content.length;
      const score = Number(memberData.score || 0) + points;
      const target = Number(roomData.gameState?.targetScore || 0);
      const winner =
        target > 0 && score >= target
          ? { uid: profile.uid, name: profile.name, score }
          : roomData.gameState?.winner || null;

      tx.update(memberRef, {
        score,
        isOnline: true,
        lastSeenAt: serverTimestamp(),
      });

      tx.update(roomRef, {
        status: "playing",
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
        gameState: {
          targetScore: target,
          currentTurnUid: profile.uid,
          lastWord: content,
          winner,
        },
      });

      tx.set(messageRef, {
        uid: profile.uid,
        displayName: profile.name,
        text: content,
        points,
        createdAt: serverTimestamp(),
      });
    });
  }

  async function setTargetScore(profileUid, scoreValue) {
    const value = Math.max(0, Math.floor(Number(scoreValue || 0)));
    const roomRef = doc(db, "rooms", roomSlug);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists()) throw new Error("ROOM_NOT_FOUND");
    if (roomDoc.data().hostUid !== profileUid) throw new Error("NOT_HOST");

    await updateDoc(roomRef, {
      updatedAt: serverTimestamp(),
      gameState: {
        targetScore: value,
        currentTurnUid: roomDoc.data().gameState?.currentTurnUid || "",
        lastWord: roomDoc.data().gameState?.lastWord || "",
        winner: roomDoc.data().gameState?.winner || null,
      },
    });
  }

  async function leaveRoom(profileUid) {
    const roomRef = doc(db, "rooms", roomSlug);
    const memberRef = doc(db, "rooms", roomSlug, "members", profileUid);

    const leaveResult = await runTransaction(db, async (tx) => {
      const roomTx = await tx.get(roomRef);
      const memberTx = await tx.get(memberRef);
      if (!roomTx.exists() || !memberTx.exists()) {
        return { left: false, wasHost: false };
      }

      const wasHost = roomTx.data().hostUid === profileUid;
      const playerCount = Number(roomTx.data().playerCount || 0);
      tx.delete(memberRef);
      tx.update(roomRef, {
        playerCount: Math.max(0, playerCount - 1),
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
      });

      return { left: true, wasHost };
    });

    if (!leaveResult.left) return;

    const remain = await getDocs(
      query(
        collection(db, "rooms", roomSlug, "members"),
        orderBy("joinedAt", "asc"),
        limit(1),
      ),
    );

    if (remain.empty) {
      await updateDoc(roomRef, {
        status: "closed",
        isPublic: false,
        hostUid: "",
        hostName: "",
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
      });
      return;
    }

    if (leaveResult.wasHost) {
      const nextHost = remain.docs[0];
      await Promise.all([
        updateDoc(roomRef, {
          hostUid: nextHost.id,
          hostName: nextHost.data().displayName || "Host",
          updatedAt: serverTimestamp(),
          lastActivityAt: serverTimestamp(),
        }),
        setDoc(nextHost.ref, { role: "host" }, { merge: true }),
      ]);
    }
  }

  return {
    joinRoom,
    sendMessage,
    setTargetScore,
    leaveRoom,
  };
}
