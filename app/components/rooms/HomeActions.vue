<template>
  <section class="col-12 col-lg-7">
    <div class="card shadow-sm mb-3">
      <div class="card-body">
        <h2 class="h5">Vao phong bang ma</h2>
        <div class="input-group">
          <input
            v-model="joinCodeModel"
            class="form-control form-control-lg"
            maxlength="4"
            inputmode="numeric"
            placeholder="Nhap ma 4 so"
            @keyup.enter="$emit('join')"
          />
          <button
            class="btn btn-primary"
            :disabled="busy === 'join'"
            @click="$emit('join')"
          >
            {{ busy === "join" ? "Dang vao..." : "Vao phong" }}
          </button>
        </div>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="card-body">
        <h2 class="h5">Tao phong moi</h2>
        <div class="mb-3">
          <label class="form-label">Room code (tuy chon)</label>
          <input
            v-model="createCodeModel"
            class="form-control"
            maxlength="4"
            inputmode="numeric"
            placeholder="De trong de auto"
          />
        </div>
        <div class="form-check form-switch mb-3">
          <input
            id="publicRoomSwitch"
            v-model="isPublicModel"
            class="form-check-input"
            type="checkbox"
          />
          <label class="form-check-label" for="publicRoomSwitch"
            >Phong public</label
          >
        </div>
        <button
          class="btn btn-success"
          :disabled="busy === 'create'"
          @click="$emit('create')"
        >
          {{ busy === "create" ? "Dang tao..." : "Tao phong" }}
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
