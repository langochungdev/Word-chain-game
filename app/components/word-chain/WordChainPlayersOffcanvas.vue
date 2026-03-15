<template>
  <div
    id="playersOffcanvas"
    class="offcanvas offcanvas-start d-md-none"
    tabindex="-1"
    aria-labelledby="playersOffcanvasLabel"
  >
    <div class="offcanvas-header">
      <h5 id="playersOffcanvasLabel" class="offcanvas-title">Người chơi</h5>
      <button
        type="button"
        class="btn-close"
        data-bs-dismiss="offcanvas"
        aria-label="Close"
      ></button>
    </div>

    <div class="offcanvas-body p-0 d-flex flex-column">
      <div
        class="p-2 border-top border-bottom d-flex align-items-center justify-content-between"
      >
        <span class="text-muted small">{{ players.length }} người</span>
      </div>

      <div class="flex-grow-1 overflow-auto p-2">
        <ul
          class="list-group list-group-flush rounded-4 shadow-sm overflow-hidden"
        >
          <li
            v-for="p in players"
            :key="p.id"
            class="list-group-item d-flex justify-content-between align-items-center py-2"
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
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type PlayerItem = {
  id: string;
  name: string;
};

defineProps<{
  players: PlayerItem[];
  myId: string;
  maxScore: number;
  scoreOf: (id: string) => number;
}>();
</script>
