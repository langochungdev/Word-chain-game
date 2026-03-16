<template>
  <main class="home-shell">
    <div class="home-shell__overlay" aria-hidden="true"></div>

    <div class="container home-shell__content">
      <header
        class="home-glass-panel home-hero home-hero-desktop d-flex flex-wrap justify-content-between align-items-start align-items-md-center gap-3 mb-4 mb-lg-5"
      >
        <div>
          <h1 class="display-6 fw-semibold mb-1">Phòng Word Chain</h1>
          <p class="home-hero__subtitle mb-0">
            Tạo phòng, vào phòng bằng mã, hoặc chọn phòng public.
          </p>
        </div>
        <div class="badge px-3 py-2 home-profile-badge">
          {{ name || "Khách" }}
        </div>
      </header>

      <div v-if="profileError || actionError" class="home-feedback-stack">
        <div
          v-if="profileError"
          class="alert alert-danger home-alert"
          role="alert"
        >
          {{ profileError }}
        </div>
        <div
          v-if="actionError"
          class="alert alert-warning home-alert"
          role="alert"
        >
          {{ actionError }}
        </div>
      </div>

      <section
        v-if="!profileReady"
        class="home-glass-panel home-status-panel d-flex align-items-center gap-2"
      >
        <div class="spinner-border spinner-border-sm" role="status"></div>
        <span>Đang khởi tạo profile...</span>
      </section>

      <div v-else class="home-ready-content">
        <div class="home-mobile-stack">
          <section
            class="home-glass-panel home-mobile-frame"
            aria-label="Hành động trên mobile"
          >
            <div class="home-mobile-frame__head">
              <span class="badge home-mobile-user">{{ name || "Khách" }}</span>
            </div>

            <div
              class="home-mobile-tabs"
              role="tablist"
              aria-label="Thao tác phòng"
            >
              <button
                type="button"
                class="btn home-mobile-tab"
                :class="mobileTab === 'join' ? 'is-active' : ''"
                :aria-selected="mobileTab === 'join'"
                @click="mobileTab = 'join'"
              >
                Tham gia phòng
              </button>
              <button
                type="button"
                class="btn home-mobile-tab"
                :class="mobileTab === 'create' ? 'is-active' : ''"
                :aria-selected="mobileTab === 'create'"
                @click="mobileTab = 'create'"
              >
                Tạo phòng
              </button>
            </div>

            <section v-if="mobileTab === 'join'" class="home-mobile-panel">
              <label class="form-label home-label">Mã phòng</label>
              <div class="home-mobile-join-controls">
                <input
                  v-model="joinCode"
                  class="form-control form-control-lg home-input"
                  maxlength="4"
                  inputmode="numeric"
                  placeholder="Nhập mã 4 số"
                  @keyup.enter="handleJoin"
                />
                <button
                  class="btn btn-primary home-btn"
                  :disabled="busy === 'join'"
                  @click="handleJoin"
                >
                  {{ busy === "join" ? "Đang vào..." : "Vào phòng" }}
                </button>
              </div>
            </section>

            <section v-else class="home-mobile-panel">
              <label class="form-label home-label">Mã phòng (tùy chọn)</label>
              <div class="home-mobile-create-row mb-3">
                <input
                  v-model="createCode"
                  class="form-control home-input"
                  maxlength="4"
                  inputmode="numeric"
                  placeholder="Để trống để tự tạo"
                />
                <button
                  type="button"
                  class="btn home-btn home-privacy-toggle"
                  :class="isPublic ? 'btn-primary' : 'btn-outline-secondary'"
                  :aria-pressed="isPublic"
                  @click="isPublic = !isPublic"
                >
                  {{ isPublic ? "Public" : "Private" }}
                </button>
              </div>

              <button
                class="btn btn-success home-btn w-100"
                :disabled="busy === 'create'"
                @click="handleCreate"
              >
                {{ busy === "create" ? "Đang tạo..." : "Tạo phòng" }}
              </button>
            </section>
          </section>

          <section
            class="home-glass-panel home-mobile-list-frame"
            aria-label="Danh sách phòng public trên mobile"
          >
            <div
              class="d-flex align-items-center justify-content-between mb-2 home-mobile-list-head"
            >
              <h3 class="h6 m-0">Phòng public</h3>
              <span class="badge rounded-pill text-bg-dark">{{
                publicRooms.length
              }}</span>
            </div>

            <p v-if="roomsLoading" class="small text-muted m-0">
              Đang tải danh sách...
            </p>
            <p v-else-if="roomsError" class="small text-danger m-0">
              {{ roomsError }}
            </p>
            <p v-else-if="!publicRooms.length" class="small text-muted m-0">
              Chưa có phòng public nào.
            </p>

            <div v-else class="home-mobile-list-scroll mt-2">
              <ul class="list-group list-group-flush home-room-list">
                <li
                  v-for="room in publicRooms"
                  :key="room.slug"
                  class="list-group-item home-room-item d-flex justify-content-between align-items-center"
                >
                  <div class="home-room-item__meta">
                    <div class="fw-semibold home-room-item__title">
                      #{{ room.slug }} · {{ room.hostName }}
                    </div>
                    <small class="text-muted home-room-item__sub"
                      >{{ room.playerCount }}/{{ room.maxPlayers }} ·
                      {{ formatUpdatedAt(room.updatedAt) }}</small
                    >
                  </div>
                  <button
                    class="btn btn-outline-primary btn-sm home-room-btn"
                    @click="goToRoom(room.slug)"
                  >
                    Vào ngay
                  </button>
                </li>
              </ul>
            </div>
          </section>
        </div>

        <div class="home-layout home-layout-desktop">
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
      </div>
    </div>

    <NameGateModal
      :visible="profileReady && !hasName && !profileError"
      title="Nhập tên trước khi tiếp tục"
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
  cleanupStaleRooms,
  ensureRoomCode,
} = useRooms();

const joinCode = ref("");
const createCode = ref("");
const isPublic = ref(true);
const nameInput = ref("");
const nameError = ref("");
const actionError = ref("");
const busy = ref<"" | "join" | "create">("");
const mobileTab = ref<"join" | "create">("join");

let stopPublicRooms: (() => void) | null = null;
let staleCleanupTicker: ReturnType<typeof setInterval> | null = null;

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
  if (!(error instanceof Error)) return "Có lỗi không xác định";
  if (error.message === "MA_PHONG_KHONG_HOP_LE")
    return "Mã phòng phải gồm 4 chữ số";
  if (error.message === "MA_PHONG_DA_TON_TAI") return "Mã phòng đã tồn tại";
  if (error.message === "KHONG_THE_TAO_PHONG")
    return "Không thể tạo phòng lúc này";
  if (error.message === "KHONG_DU_QUYEN_FIRESTORE")
    return "Không đủ quyền ghi Firestore. Kiểm tra lại firestore.rules đã deploy đúng project.";
  if (error.message === "CHUA_DANG_NHAP")
    return "Chưa xác thực Firebase Auth. Kiểm tra Anonymous Auth đã bật.";
  if (error.message === "TEN_KHONG_HOP_LE") return "Tên phải từ 2 đến 24 ký tự";
  if (error.message === "USER_KHONG_HOP_LE")
    return "Không tìm thấy danh tính người dùng";
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

  cleanupStaleRooms(0.05).catch(() => undefined);
  staleCleanupTicker = setInterval(() => {
    cleanupStaleRooms(0.05).catch(() => undefined);
  }, 60000);

  startPublicRooms();
});

onBeforeUnmount(() => {
  if (staleCleanupTicker) {
    clearInterval(staleCleanupTicker);
    staleCleanupTicker = null;
  }

  if (stopPublicRooms) {
    stopPublicRooms();
    stopPublicRooms = null;
  }
});
</script>
