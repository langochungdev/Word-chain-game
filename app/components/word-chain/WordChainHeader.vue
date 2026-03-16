<template>
  <div class="chat-header border-bottom">
    <div class="d-flex align-items-center justify-content-between gap-2 w-100">
      <div class="d-flex align-items-center gap-2">
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm room-home-btn"
          @click="$emit('go-home')"
        >
          <span class="d-none d-sm-inline">← Home</span>
          <span class="d-inline d-sm-none">←</span>
        </button>

        <button
          class="btn btn-outline-secondary btn-sm d-inline-flex d-md-none"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#playersOffcanvas"
          aria-controls="playersOffcanvas"
        >
          👥 Người chơi
        </button>
        <span class="hide-on-mobile">
          <span class="fw-semibold">PIN phòng:</span>
          <span class="badge bg-dark text-white">{{ roomId }}</span>
        </span>
      </div>

      <div class="flex-grow-1 d-flex justify-content-center">
        <div class="d-flex align-items-center gap-2 target-actions">
          <span
            class="badge bg-primary text-white rounded-pill px-3 py-2 target-badge"
            title="Đặt target score"
            @click="$emit('open-target')"
          >
            🎯 Target: {{ targetScore }}
          </span>
          <button
            type="button"
            class="btn btn-sm target-reset-btn"
            @click="$emit('reset-round')"
          >
            Reset
          </button>
        </div>
      </div>

      <div class="d-flex align-items-center gap-2 ms-auto">
        <div class="form-check form-switch m-0">
          <input
            id="sugSwitch"
            v-model="suggestModel"
            class="form-check-input"
            type="checkbox"
          />
          <label class="form-check-label" for="sugSwitch">Gợi ý</label>
        </div>
      </div>
    </div>

    <div
      v-if="showWinner && winner"
      id="showwiner"
      class="modal d-block text-center"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content p-4 rounded-4 shadow-lg">
          <h3 class="mb-3">🏁 Người chiến thắng!</h3>
          <h4>
            <span class="neon-name">{{ winner.name }}</span> ({{ winner.score }}
            điểm)
          </h4>
          <button class="btn btn-primary mt-3" @click="$emit('close-winner')">
            OK
          </button>
        </div>
      </div>
    </div>
    <div v-if="showWinner" class="modal-backdrop show"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

type WinnerState = {
  name: string;
  score: number;
} | null;

const props = defineProps<{
  roomId: string;
  targetScore: number;
  suggestOn: boolean;
  showWinner: boolean;
  winner: WinnerState;
}>();

const emit = defineEmits<{
  "update:suggestOn": [value: boolean];
  "open-target": [];
  "reset-round": [];
  "close-winner": [];
  "go-home": [];
}>();

const suggestModel = computed({
  get: () => props.suggestOn,
  set: (value: boolean) => emit("update:suggestOn", value),
});
</script>
