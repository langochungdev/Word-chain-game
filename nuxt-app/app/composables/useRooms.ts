import {
  Timestamp,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

const DEFAULT_MAX_PLAYERS = 8;
const MAX_PLAYERS_CAP = 20;
const MAX_AUTO_RETRY = 20;

type RoomStatus = "open" | "playing" | "closed";

type RoomSummary = {
  slug: string;
  hostName: string;
  isPublic: boolean;
  status: RoomStatus;
  maxPlayers: number;
  playerCount: number;
  updatedAt: unknown;
};

type CreateRoomInput = {
  slugInput: string;
  isPublic: boolean;
  profileName: string;
  profileUid: string;
};

function sanitizeSlug(input: string) {
  return String(input || "")
    .replace(/\D/g, "")
    .slice(0, 4);
}

function sanitizeName(input: string) {
  return String(input || "")
    .trim()
    .replace(/\s+/g, " ");
}

function ensureRoomCode(input: string) {
  const slug = sanitizeSlug(input);
  if (!slug || slug.length !== 4) {
    throw new Error("MA_PHONG_KHONG_HOP_LE");
  }
  return slug;
}

function randomSlug4() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

function normalizeRoom(id: string, data: Record<string, unknown>): RoomSummary {
  const parsedMax = Number(data.maxPlayers || DEFAULT_MAX_PLAYERS);
  return {
    slug: id,
    hostName: String(data.hostName || "Unknown"),
    isPublic: Boolean(data.isPublic),
    status: String(data.status || "open") as RoomStatus,
    maxPlayers: Math.max(
      1,
      Math.min(MAX_PLAYERS_CAP, parsedMax || DEFAULT_MAX_PLAYERS),
    ),
    playerCount: Number(data.playerCount || 0),
    updatedAt: data.updatedAt || null,
  };
}

export function useRooms() {
  const { db } = useFirebaseClient();
  const publicRooms = useState<RoomSummary[]>("rooms.public", () => []);
  const roomsLoading = useState("rooms.loading", () => false);
  const roomsError = useState("rooms.error", () => "");

  function subscribePublicRooms() {
    roomsLoading.value = true;
    roomsError.value = "";

    const q = query(
      collection(db, "rooms"),
      where("isPublic", "==", true),
      where("status", "==", "open"),
      orderBy("updatedAt", "desc"),
      limit(20),
    );

    return onSnapshot(
      q,
      (snap) => {
        publicRooms.value = snap.docs.map((item) =>
          normalizeRoom(item.id, item.data()),
        );
        roomsLoading.value = false;
      },
      () => {
        roomsError.value = "Khong tai duoc danh sach phong";
        roomsLoading.value = false;
      },
    );
  }

  async function createRoom({
    slugInput,
    isPublic,
    profileName,
    profileUid,
  }: CreateRoomInput) {
    const slug = sanitizeSlug(slugInput);
    const cleanedName = sanitizeName(profileName);

    if (slug && slug.length !== 4) {
      throw new Error("MA_PHONG_KHONG_HOP_LE");
    }
    if (!cleanedName || cleanedName.length < 2 || cleanedName.length > 24) {
      throw new Error("TEN_KHONG_HOP_LE");
    }
    if (!String(profileUid || "")) {
      throw new Error("USER_KHONG_HOP_LE");
    }

    const createBySlug = async (targetSlug: string) => {
      const roomRef = doc(db, "rooms", targetSlug);
      const memberRef = doc(db, "rooms", targetSlug, "members", profileUid);
      const now = serverTimestamp();

      await runTransaction(db, async (tx) => {
        const roomDoc = await tx.get(roomRef);
        if (roomDoc.exists()) {
          throw new Error("MA_PHONG_DA_TON_TAI");
        }

        tx.set(roomRef, {
          slug: targetSlug,
          hostUid: profileUid,
          hostName: cleanedName,
          isPublic: Boolean(isPublic),
          status: "open",
          maxPlayers: DEFAULT_MAX_PLAYERS,
          playerCount: 1,
          createdAt: now,
          updatedAt: now,
          lastActivityAt: now,
          gameState: {
            targetScore: 0,
            currentTurnUid: "",
            lastWord: "",
            winner: null,
          },
        });

        tx.set(memberRef, {
          displayName: cleanedName,
          role: "host",
          score: 0,
          isOnline: true,
          joinedAt: now,
          lastSeenAt: now,
        });
      });

      return targetSlug;
    };

    if (slug) {
      return createBySlug(ensureRoomCode(slug));
    }

    for (let i = 0; i < MAX_AUTO_RETRY; i += 1) {
      const generated = randomSlug4();
      try {
        return await createBySlug(generated);
      } catch (error) {
        if (error instanceof Error && error.message === "MA_PHONG_DA_TON_TAI") {
          continue;
        }
        throw error;
      }
    }

    throw new Error("KHONG_THE_TAO_PHONG");
  }

  async function cleanupStaleRooms(hours = 6) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const q = query(
      collection(db, "rooms"),
      where("status", "==", "open"),
      where("lastActivityAt", "<", Timestamp.fromDate(cutoff)),
      limit(20),
    );

    const stale = await getDocs(q);
    if (!stale.size) return 0;

    const batch = writeBatch(db);
    stale.docs.forEach((item) => {
      batch.update(item.ref, {
        status: "closed",
        isPublic: false,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    return stale.size;
  }

  return {
    publicRooms,
    roomsLoading,
    roomsError,
    subscribePublicRooms,
    createRoom,
    cleanupStaleRooms,
    ensureRoomCode,
  };
}
