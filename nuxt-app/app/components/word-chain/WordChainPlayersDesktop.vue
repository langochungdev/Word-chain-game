<template>
  <aside
    class="col-md-4 d-none d-md-flex flex-column border-end players-panel"
    style="height: 100%"
  >
    <div
      class="p-2 border-bottom d-flex align-items-center justify-content-between"
    >
      <div class="d-flex align-items-center gap-2 ms-auto">
        <span class="fw-semibold">Số người:</span>
        <span class="badge bg-primary text-white">{{ playerCount }}</span>
      </div>
    </div>

    <div class="list-wrap p-2 overflow-auto" style="height: calc(100vh - 48px)">
      <div>
        <div
          v-for="p in sortedPlayers"
          :key="p.id"
          class="card shadow-sm player-card"
        >
          <div
            class="mb-2 card-body d-flex justify-content-between align-items-center"
          >
            <span :class="p.id === myId ? 'neon-name' : 'neon-name-orange'">{{
              p.name
            }}</span>
            <span
              class="badge rounded-pill px-3 py-2"
              :class="
                scoreOf(p.id) === maxScore
                  ? 'bg-warning text-dark'
                  : 'bg-secondary-subtle text-secondary-emphasis'
              "
            >
              <span v-if="scoreOf(p.id) === maxScore">🏆</span>
              {{ scoreOf(p.id) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
type PlayerItem = {
  id: string;
  name: string;
};

defineProps<{
  sortedPlayers: PlayerItem[];
  playerCount: number;
  myId: string;
  maxScore: number;
  scoreOf: (id: string) => number;
}>();
</script>
