<template>
  <main class="container py-4" style="min-height: 100dvh; overflow: auto">
    <header
      class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"
    >
      <div>
        <h1 class="h4 m-0">Phong #{{ roomSlug }}</h1>
        <p class="text-muted m-0">
          {{ roomState?.status || "loading" }} ·
          {{ roomState?.hostName || "-" }}
        </p>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-outline-secondary" @click="leaveAndBack">
          Roi phong
        </button>
      </div>
    </header>

    <div v-if="actionError" class="alert alert-warning" role="alert">
      {{ actionError }}
    </div>
    <div v-if="profileError" class="alert alert-danger" role="alert">
      {{ profileError }}
    </div>
    <div v-if="presenceError" class="alert alert-danger" role="alert">
      {{ presenceError }}
    </div>
    <div v-if="roomError" class="alert alert-danger" role="alert">
      {{ roomError }}
    </div>

    <div v-if="roomLoading" class="d-flex align-items-center gap-2">
      <div class="spinner-border spinner-border-sm" role="status"></div>
      <span>Dang tai du lieu phong...</span>
    </div>

    <div v-else-if="roomState" class="row g-3">
      <RoomSidebar
        :room-state="roomState"
        :members="members"
        :is-host="isHost"
        v-model:target-score-input="targetScoreInput"
        @update-target="updateTarget"
      />
      <RoomChat
        :ordered-messages="orderedMessages"
        v-model:message-input="messageInput"
        :format-updated-at="formatUpdatedAt"
        @send="sendChat"
      />
    </div>

    <NameGateModal
      :visible="profileReady && !hasName && !profileError"
      title="Nhap ten de vao phong"
      v-model="nameInput"
      :error="nameError"
      @submit="submitName"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import NameGateModal from "~/components/rooms/NameGateModal.vue";
import RoomChat from "~/components/rooms/RoomChat.vue";
import RoomSidebar from "~/components/rooms/RoomSidebar.vue";
import { usePresence } from "~/composables/usePresence";
import { useProfile } from "~/composables/useProfile";
import { useRoom } from "~/composables/useRoom";

type RoomState = {
  hostUid: string;
  hostName: string;
  status: string;
  playerCount: number;
  maxPlayers: number;
  gameState?: {
    targetScore?: number;
  };
};

const route = useRoute();
const router = useRouter();
const normalizedSlug = String(route.params.slug || "")
  .replace(/\D/g, "")
  .slice(0, 4);
const roomSlug = normalizedSlug.length === 4 ? normalizedSlug : "0000";

const {
  uid,
  name,
  hasName,
  profileReady,
  profileError,
  bootstrapProfile,
  saveName,
} = useProfile();
const {
  room,
  members,
  messages,
  roomLoading,
  roomError,
  subscribeRoomData,
  joinRoom,
  sendMessage,
  setTargetScore,
  leaveRoom,
} = useRoom(roomSlug);
const { startPresence, stopPresence, presenceError } = usePresence();

const messageInput = ref("");
const targetScoreInput = ref(0);
const nameInput = ref("");
const nameError = ref("");
const actionError = ref("");
const joined = ref(false);
let unsubscribeRoom: (() => void) | null = null;

const roomState = computed(() => room.value as RoomState | null);
const orderedMessages = computed(() => [...messages.value].reverse());
const isHost = computed(() => roomState.value?.hostUid === uid.value);

function mapError(error: unknown) {
  const firebaseError = error as { code?: string; message?: string };
  if (firebaseError?.code === "permission-denied") {
    return "Khong du quyen thao tac Firestore. Kiem tra lai firestore.rules.";
  }
  if (firebaseError?.code === "unauthenticated") {
    return "Ban chua dang nhap Firebase Auth.";
  }

  if (!(error instanceof Error)) return "Co loi khong xac dinh";
  if (error.message === "ROOM_NOT_FOUND") return "Phong khong ton tai";
  if (error.message === "ROOM_NOT_OPEN") return "Phong da dong";
  if (error.message === "ROOM_FULL") return "Phong da day";
  if (error.message === "NOT_IN_ROOM") return "Ban khong nam trong phong";
  if (error.message === "NOT_HOST") return "Chi host moi duoc thay doi target";
  return error.message;
}

function formatUpdatedAt(value: unknown) {
  const dateValue = value as { toDate?: () => Date; seconds?: number };
  const date =
    typeof dateValue?.toDate === "function"
      ? dateValue.toDate()
      : typeof dateValue?.seconds === "number"
        ? new Date(dateValue.seconds * 1000)
        : null;
  if (!date) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function ensureJoined() {
  if (joined.value || !uid.value || !name.value) return;
  await joinRoom({ uid: uid.value, name: name.value });
  startPresence({ slug: roomSlug, profileUid: uid.value });
  joined.value = true;
}

async function submitName() {
  nameError.value = "";
  const error = saveName(nameInput.value);
  if (error) {
    nameError.value = error;
    return;
  }
  try {
    await ensureJoined();
  } catch (joinError) {
    actionError.value = mapError(joinError);
  }
}

async function sendChat() {
  actionError.value = "";
  try {
    await sendMessage({ uid: uid.value, name: name.value }, messageInput.value);
    messageInput.value = "";
  } catch (error) {
    actionError.value = mapError(error);
  }
}

async function updateTarget() {
  actionError.value = "";
  try {
    await setTargetScore(uid.value, Number(targetScoreInput.value));
  } catch (error) {
    actionError.value = mapError(error);
  }
}

async function leaveAndBack() {
  try {
    if (joined.value) {
      await leaveRoom(uid.value);
      await stopPresence();
      joined.value = false;
    }
  } catch (leaveError) {
    actionError.value = mapError(leaveError);
  }
  await router.push("/");
}

onMounted(async () => {
  if (normalizedSlug.length !== 4) {
    await router.replace("/");
    return;
  }

  unsubscribeRoom = subscribeRoomData();
  await bootstrapProfile();
  nameInput.value = name.value;

  if (!hasName.value) return;

  try {
    await ensureJoined();
  } catch (error) {
    actionError.value = mapError(error);
  }
});

onBeforeUnmount(() => {
  if (unsubscribeRoom) {
    unsubscribeRoom();
    unsubscribeRoom = null;
  }

  if (joined.value) {
    leaveRoom(uid.value).catch((error) => {
      console.error("leaveRoom on unmount failed", error);
    });
    stopPresence().catch((error) => {
      console.error("stopPresence on unmount failed", error);
    });
  }
});
</script>
