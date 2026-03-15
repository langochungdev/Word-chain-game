<template>
  <section class="col-12 col-lg-5">
    <div class="card shadow-sm h-100">
      <div class="card-body">
        <h2 class="h5">Phong public dang mo</h2>
        <p v-if="roomsError" class="text-danger mb-2">{{ roomsError }}</p>
        <p v-if="roomsLoading" class="text-muted mb-2">Dang tai danh sach...</p>
        <p v-else-if="!rooms.length" class="text-muted mb-2">
          Chua co phong public nao.
        </p>
        <ul v-else class="list-group list-group-flush">
          <li
            v-for="room in rooms"
            :key="room.slug"
            class="list-group-item d-flex justify-content-between align-items-center px-0"
          >
            <div>
              <div class="fw-semibold">
                #{{ room.slug }} · {{ room.hostName }}
              </div>
              <small class="text-muted"
                >{{ room.playerCount }}/{{ room.maxPlayers }} ·
                {{ formatUpdatedAt(room.updatedAt) }}</small
              >
            </div>
            <button
              class="btn btn-outline-primary btn-sm"
              @click="$emit('go', room.slug)"
            >
              Vao ngay
            </button>
          </li>
        </ul>
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
