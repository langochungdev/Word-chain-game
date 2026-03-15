<template>
  <section class="col-12 col-lg-4">
    <div class="card shadow-sm mb-3">
      <div class="card-body">
        <h2 class="h6">Thong tin phong</h2>
        <p class="mb-1">
          Host: <strong>{{ roomState.hostName }}</strong>
        </p>
        <p class="mb-1">
          Nguoi choi: {{ roomState.playerCount }}/{{ roomState.maxPlayers }}
        </p>
        <p class="mb-0">Target: {{ roomState.gameState?.targetScore || 0 }}</p>
      </div>
    </div>

    <div class="card shadow-sm mb-3" v-if="isHost">
      <div class="card-body">
        <h2 class="h6">Dieu chinh target score</h2>
        <div class="input-group">
          <input
            v-model.number="targetModel"
            class="form-control"
            type="number"
            min="0"
          />
          <button class="btn btn-primary" @click="$emit('updateTarget')">
            Cap nhat
          </button>
        </div>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="card-body">
        <h2 class="h6">Thanh vien</h2>
        <ul class="list-group list-group-flush">
          <li
            v-for="member in members"
            :key="member.uid"
            class="list-group-item d-flex justify-content-between align-items-center px-0"
          >
            <div>
              <span class="fw-semibold">{{ member.displayName }}</span>
              <small class="text-muted"> · {{ member.role }}</small>
            </div>
            <span class="badge text-bg-secondary">{{ member.score }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

type RoomState = {
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  gameState?: {
    targetScore?: number;
  };
};

type RoomMember = {
  uid: string;
  displayName: string;
  role: "host" | "player";
  score: number;
};

const props = defineProps<{
  roomState: RoomState;
  members: RoomMember[];
  isHost: boolean;
  targetScoreInput: number;
}>();

const emit = defineEmits<{
  "update:targetScoreInput": [value: number];
  updateTarget: [];
}>();

const targetModel = computed({
  get: () => props.targetScoreInput,
  set: (value: number) => emit("update:targetScoreInput", value),
});
</script>
