import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

function normalizeMember(uid, data) {
  return {
    uid,
    displayName: data.displayName || "Unknown",
    role: data.role || "player",
    score: Number(data.score || 0),
    isOnline: Boolean(data.isOnline),
    joinedAt: data.joinedAt || null,
  };
}

function normalizeMessage(id, data) {
  return {
    id,
    uid: data.uid || "",
    displayName: data.displayName || "Unknown",
    text: data.text || "",
    points: Number(data.points || 0),
    createdAt: data.createdAt || null,
  };
}

export function useRoomSubscriptions({ db, roomSlug, room, members, messages, roomLoading, roomError }) {
  const roomRef = doc(db, "rooms", roomSlug);
  const membersRef = collection(db, "rooms", roomSlug, "members");
  const messagesRef = collection(db, "rooms", roomSlug, "messages");

  return () => {
    roomLoading.value = true;

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
      const list = snap.docs.map((item) => normalizeMember(item.id, item.data()));
      members.value = list.sort((a, b) => b.score - a.score);
    });

    const unsubMessages = onSnapshot(
      query(messagesRef, orderBy("createdAt", "desc"), limit(50)),
      (snap) => {
        messages.value = snap.docs.map((item) => normalizeMessage(item.id, item.data()));
      },
    );

    return () => {
      unsubRoom();
      unsubMembers();
      unsubMessages();
    };
  };
}
