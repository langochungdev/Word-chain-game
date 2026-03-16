<template>
  <section class="home-actions" aria-label="Hành động phòng">
    <div class="home-glass-panel home-card home-action-card">
      <div class="home-card__body">
        <div class="home-section-head mb-3">
          <p class="home-kicker mb-1">Vào nhanh</p>
          <h2 class="h5 mb-0">Vào phòng bằng mã</h2>
        </div>
        <p class="home-section-copy mb-3">
          Nhập mã 4 số để vào thẳng phòng đang chơi.
        </p>
        <div class="input-group home-input-group home-join-controls">
          <input
            v-model="joinCodeModel"
            class="form-control form-control-lg home-input"
            maxlength="4"
            inputmode="numeric"
            placeholder="Nhập mã 4 số"
            @keyup.enter="$emit('join')"
          />
          <button
            class="btn btn-primary home-btn"
            :disabled="busy === 'join'"
            @click="$emit('join')"
          >
            {{ busy === "join" ? "Đang vào..." : "Vào phòng" }}
          </button>
        </div>
      </div>
    </div>

    <div class="home-glass-panel home-card home-action-card">
      <div class="home-card__body">
        <div class="home-section-head mb-3">
          <p class="home-kicker mb-1">Tạo mới</p>
          <h2 class="h5 mb-0">Tạo phòng mới</h2>
        </div>
        <p class="home-section-copy mb-3">
          Tạo phòng private hoặc public để bắt đầu trận ngay.
        </p>
        <div class="mb-3">
          <label class="form-label home-label">Mã phòng (tùy chọn)</label>
          <input
            v-model="createCodeModel"
            class="form-control home-input"
            maxlength="4"
            inputmode="numeric"
            placeholder="Để trống để tự tạo"
          />
        </div>
        <div class="form-check form-switch mb-3 home-switch">
          <input
            id="publicRoomSwitch"
            v-model="isPublicModel"
            class="form-check-input"
            type="checkbox"
          />
          <label class="form-check-label" for="publicRoomSwitch"
            >Phòng public</label
          >
        </div>
        <button
          class="btn btn-success home-btn"
          :disabled="busy === 'create'"
          @click="$emit('create')"
        >
          {{ busy === "create" ? "Đang tạo..." : "Tạo phòng" }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  joinCode: string;
  createCode: string;
  isPublic: boolean;
  busy: "" | "join" | "create";
}>();

const emit = defineEmits<{
  "update:joinCode": [value: string];
  "update:createCode": [value: string];
  "update:isPublic": [value: boolean];
  join: [];
  create: [];
}>();

const joinCodeModel = computed({
  get: () => props.joinCode,
  set: (value: string) => emit("update:joinCode", value),
});

const createCodeModel = computed({
  get: () => props.createCode,
  set: (value: string) => emit("update:createCode", value),
});

const isPublicModel = computed({
  get: () => props.isPublic,
  set: (value: boolean) => emit("update:isPublic", value),
});
</script>
