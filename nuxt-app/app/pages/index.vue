<template>
  <main class="container py-4" style="min-height: 100dvh; overflow: auto">
    <header
      class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4"
    >
      <div>
        <h1 class="h3 m-0">Word Chain Rooms</h1>
        <p class="text-muted m-0">
          Tao phong, vao phong bang ma, hoac chon phong public.
        </p>
      </div>
      <div class="badge text-bg-dark px-3 py-2">{{ name || "Guest" }}</div>
    </header>

    <div v-if="profileError" class="alert alert-danger" role="alert">
      {{ profileError }}
    </div>
    <div v-if="actionError" class="alert alert-warning" role="alert">
      {{ actionError }}
    </div>

    <div v-if="!profileReady" class="d-flex align-items-center gap-2">
      <div class="spinner-border spinner-border-sm" role="status"></div>
      <span>Dang khoi tao profile...</span>
    </div>

    <div v-else class="row g-3">
      <HomeActions
        v-model:join-code="joinCode"
        v-model:create-code="createCode"
        v-model:is-public="isPublic"
        :busy="busy"
        @join="handleJoin"
        @create="handleCreate"
      />
      <PublicRoomsList
        :rooms="publicRooms"
        :rooms-loading="roomsLoading"
        :rooms-error="roomsError"
        :format-updated-at="formatUpdatedAt"
        @go="goToRoom"
      />
    </div>

    <NameGateModal
      :visible="profileReady && !hasName"
      title="Nhap ten truoc khi tiep tuc"
      v-model="nameInput"
      :error="nameError"
      @submit="submitName"
    />
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import HomeActions from "~/components/rooms/HomeActions.vue";
import NameGateModal from "~/components/rooms/NameGateModal.vue";
import PublicRoomsList from "~/components/rooms/PublicRoomsList.vue";
import { useProfile } from "~/composables/useProfile";
import { useRooms } from "~/composables/useRooms";

const router = useRouter();
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
  publicRooms,
  roomsLoading,
  roomsError,
  subscribePublicRooms,
  createRoom,
  ensureRoomCode,
} = useRooms();

const joinCode = ref("");
const createCode = ref("");
const isPublic = ref(true);
const nameInput = ref("");
const nameError = ref("");
const actionError = ref("");
const busy = ref<"" | "join" | "create">("");

let stopPublicRooms: (() => void) | null = null;

function startPublicRooms() {
  if (!hasName.value || stopPublicRooms) return;
  stopPublicRooms = subscribePublicRooms();
}

function normalizeCode(value: string) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 4);
}

function mapError(error: unknown) {
  if (!(error instanceof Error)) return "Co loi khong xac dinh";
  if (error.message === "MA_PHONG_KHONG_HOP_LE")
    return "Ma phong phai gom 4 chu so";
  if (error.message === "MA_PHONG_DA_TON_TAI") return "Ma phong da ton tai";
  if (error.message === "KHONG_THE_TAO_PHONG")
    return "Khong the tao phong luc nay";
  if (error.message === "TEN_KHONG_HOP_LE") return "Ten phai tu 2 den 24 ky tu";
  if (error.message === "USER_KHONG_HOP_LE")
    return "Khong tim thay danh tinh nguoi dung";
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

async function submitName() {
  nameError.value = "";
  const error = saveName(nameInput.value);
  if (error) {
    nameError.value = error;
    return;
  }
  startPublicRooms();
}

function goToRoom(slug: string) {
  router.push(`/room/${slug}`);
}

async function handleJoin() {
  actionError.value = "";
  busy.value = "join";
  try {
    const slug = ensureRoomCode(normalizeCode(joinCode.value));
    goToRoom(slug);
  } catch (error) {
    actionError.value = mapError(error);
  } finally {
    busy.value = "";
  }
}

async function handleCreate() {
  actionError.value = "";
  busy.value = "create";
  try {
    const slug = await createRoom({
      slugInput: normalizeCode(createCode.value),
      isPublic: isPublic.value,
      profileName: name.value,
      profileUid: uid.value,
    });
    goToRoom(slug);
  } catch (error) {
    actionError.value = mapError(error);
  } finally {
    busy.value = "";
  }
}

onMounted(async () => {
  await bootstrapProfile();
  nameInput.value = name.value;
  startPublicRooms();
});

onBeforeUnmount(() => {
  if (stopPublicRooms) {
    stopPublicRooms();
    stopPublicRooms = null;
  }
});
</script>
