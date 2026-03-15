<template>
  <section class="col-12 col-lg-8">
    <div class="card shadow-sm">
      <div class="card-body d-flex flex-column" style="height: 70vh">
        <h2 class="h6">Tin nhan</h2>
        <div class="flex-grow-1 overflow-auto border rounded p-2 mb-3">
          <p v-if="!orderedMessages.length" class="text-muted mb-0">
            Chua co tin nhan
          </p>
          <div v-for="item in orderedMessages" :key="item.id" class="mb-2">
            <div class="small text-muted">
              {{ item.displayName }} · +{{ item.points }} ·
              {{ formatUpdatedAt(item.createdAt) }}
            </div>
            <div>{{ item.text }}</div>
          </div>
        </div>
        <div class="input-group">
          <input
            v-model="messageModel"
            class="form-control"
            placeholder="Nhap tu cua ban"
            @keyup.enter="$emit('send')"
          />
          <button class="btn btn-success" @click="$emit('send')">Gui</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

type RoomMessage = {
  id: string;
  displayName: string;
  text: string;
  points: number;
  createdAt: unknown;
};

const props = defineProps<{
  orderedMessages: RoomMessage[];
  messageInput: string;
  formatUpdatedAt: (value: unknown) => string;
}>();

const emit = defineEmits<{
  "update:messageInput": [value: string];
  send: [];
}>();

const messageModel = computed({
  get: () => props.messageInput,
  set: (value: string) => emit("update:messageInput", value),
});
</script>
