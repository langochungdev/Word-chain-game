<template>
  <section class="home-public-list" aria-label="Danh sách phòng public">
    <div class="home-glass-panel home-card h-100">
      <div class="home-card__body d-flex flex-column home-public-card-body">
        <div
          class="home-section-head mb-3 d-flex align-items-center justify-content-between gap-2"
        >
          <div>
            <p class="home-kicker mb-1">Khám phá</p>
            <h2 class="h5 mb-0">Phòng public đang mở</h2>
          </div>
          <span class="badge rounded-pill text-bg-dark home-room-count">
            {{ rooms.length }}
          </span>
        </div>
        <p v-if="roomsError" class="text-danger mb-2 home-list-state">
          {{ roomsError }}
        </p>
        <p v-if="roomsLoading" class="text-muted mb-2 home-list-state">
          Đang tải danh sách...
        </p>
        <p v-else-if="!rooms.length" class="text-muted mb-2 home-list-state">
          Chưa có phòng public nào.
        </p>
        <div v-else class="home-room-list-scroll mt-1">
          <ul class="list-group list-group-flush home-room-list">
            <li
              v-for="room in rooms"
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
                @click="$emit('go', room.slug)"
              >
                Vào ngay
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
type RoomSummary = {
  slug: string;
  hostName: string;
  maxPlayers: number;
  playerCount: number;
  updatedAt: unknown;
};

defineProps<{
  rooms: RoomSummary[];
  roomsLoading: boolean;
  roomsError: string;
  formatUpdatedAt: (value: unknown) => string;
}>();

defineEmits<{
  go: [slug: string];
}>();
</script>
