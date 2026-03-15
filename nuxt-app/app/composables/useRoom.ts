import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

const MAX_PLAYERS_CAP = 20;

type RoomMember = {
  uid: string;
  displayName: string;
  role: "host" | "player";
  score: number;
  isOnline: boolean;
  joinedAt: unknown;
};

type RoomMessage = {
  id: string;
  uid: string;
  displayName: string;
  text: string;
  points: number;
  roundId: number;
  createdAt: unknown;
};

function normalizeMember(
  uid: string,
  data: Record<string, unknown>,
): RoomMember {
  return {
    uid,
    displayName: String(data.displayName || "Unknown"),
    role: String(data.role || "player") === "host" ? "host" : "player",
    score: Number(data.score || 0),
    isOnline: Boolean(data.isOnline),
    joinedAt: data.joinedAt || null,
  };
}

function normalizeMessage(
  id: string,
  data: Record<string, unknown>,
): RoomMessage {
  return {
    id,
    uid: String(data.uid || ""),
    displayName: String(data.displayName || "Unknown"),
    text: String(data.text || ""),
    points: Number(data.points || 0),
    roundId: Number(data.roundId || 0),
    createdAt: data.createdAt || null,
  };
}

export function useRoom(roomSlug: string) {
  const { db } = useFirebaseClient();
  const room = useState<Record<string, unknown> | null>(
    `room.${roomSlug}.detail`,
    () => null,
  );
  const members = useState<RoomMember[]>(`room.${roomSlug}.members`, () => []);
  const messages = useState<RoomMessage[]>(
    `room.${roomSlug}.messages`,
    () => [],
  );
  const roomLoading = useState(`room.${roomSlug}.loading`, () => true);
  const roomError = useState(`room.${roomSlug}.error`, () => "");

  function subscribeRoomData() {
    roomLoading.value = true;

    const roomRef = doc(db, "rooms", roomSlug);
    const membersRef = collection(db, "rooms", roomSlug, "members");
    const messagesRef = collection(db, "rooms", roomSlug, "messages");

    const unsubRoom = onSnapshot(roomRef, (snap) => {
      if (!snap.exists()) {
        room.value = null;
        roomError.value = "Phong khong ton tai";
        roomLoading.value = false;
        return;
      }

      room.value = { slug: snap.id, ...snap.data() };
      roomError.value = "";
      roomLoading.value = false;
    });

    const unsubMembers = onSnapshot(membersRef, (snap) => {
      const list = snap.docs.map((item) =>
        normalizeMember(item.id, item.data()),
      );
      members.value = list.sort((a, b) => b.score - a.score);
    });

    const unsubMessages = onSnapshot(
      query(messagesRef, orderBy("createdAt", "desc"), limit(50)),
      (snap) => {
        messages.value = snap.docs.map((item) =>
          normalizeMessage(item.id, item.data()),
        );
      },
    );

    return () => {
      unsubRoom();
      unsubMembers();
      unsubMessages();
    };
  }

  async function joinRoom(profile: { uid: string; name: string }) {
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

  async function sendMessage(
    profile: { uid: string; name: string },
    text: string,
  ) {
    const content = String(text || "")
      .trim()
      .toLowerCase();
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
      if (roomData.status !== "open" && roomData.status !== "playing") {
        throw new Error("ROOM_NOT_OPEN");
      }

      const memberData = memberDoc.data();
      const target = Number(roomData.gameState?.targetScore || 0);
      if (target <= 0) throw new Error("TARGET_NOT_SET");
      if (roomData.gameState?.winner) throw new Error("ROUND_FINISHED");

      const roundId = Number(roomData.gameState?.roundId || 0);
      if (roundId <= 0) throw new Error("ROUND_NOT_STARTED");

      const points = content.length;
      const score = Number(memberData.score || 0) + points;
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
          roundId,
          winner,
        },
      });

      tx.set(messageRef, {
        uid: profile.uid,
        displayName: profile.name,
        text: content,
        points,
        roundId,
        createdAt: serverTimestamp(),
      });
    });
  }

  async function setTargetScore(profileUid: string, scoreValue: number) {
    const value = Math.max(0, Math.floor(Number(scoreValue || 0)));
    const roomRef = doc(db, "rooms", roomSlug);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists()) throw new Error("ROOM_NOT_FOUND");
    if (roomDoc.data().hostUid !== profileUid) throw new Error("NOT_HOST");

    const gameState = roomDoc.data().gameState || {};
    const previousTarget = Number(gameState.targetScore || 0);
    const previousRoundId = Number(gameState.roundId || 0);
    const startsNewRound = value > 0 && previousTarget === 0;
    const resetsRound = value === 0;
    const nextRoundId = startsNewRound ? previousRoundId + 1 : previousRoundId;

    await updateDoc(roomRef, {
      status: value > 0 ? "playing" : "open",
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
      gameState: {
        targetScore: value,
        currentTurnUid:
          startsNewRound || resetsRound ? "" : gameState.currentTurnUid || "",
        lastWord: startsNewRound || resetsRound ? "" : gameState.lastWord || "",
        roundId: nextRoundId,
        winner: startsNewRound || resetsRound ? null : gameState.winner || null,
      },
    });
  }

  async function resetRound(profileUid: string) {
    const roomRef = doc(db, "rooms", roomSlug);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists()) throw new Error("ROOM_NOT_FOUND");
    if (roomDoc.data().hostUid !== profileUid) throw new Error("NOT_HOST");

    const membersRef = collection(db, "rooms", roomSlug, "members");
    const membersSnap = await getDocs(membersRef);
    const roundId = Number(roomDoc.data().gameState?.roundId || 0);

    const batch = writeBatch(db);
    membersSnap.docs.forEach((memberDoc) => {
      batch.update(memberDoc.ref, {
        score: 0,
      });
    });

    batch.update(roomRef, {
      status: "open",
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
      gameState: {
        targetScore: 0,
        currentTurnUid: "",
        lastWord: "",
        roundId,
        winner: null,
      },
    });

    await batch.commit();
  }

  async function leaveRoom(profileUid: string) {
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
      await updateDoc(roomRef, {
        hostUid: nextHost.id,
        hostName: nextHost.data().displayName || "Host",
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
      });
      await setDoc(nextHost.ref, { role: "host" }, { merge: true });
    }
  }

  return {
    room,
    members,
    messages,
    roomLoading,
    roomError,
    subscribeRoomData,
    joinRoom,
    sendMessage,
    setTargetScore,
    resetRound,
    leaveRoom,
  };
}
