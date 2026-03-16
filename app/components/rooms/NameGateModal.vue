<template>
  <div v-if="visible" class="modal d-block home-name-modal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content home-modal-content">
        <div class="modal-header border-0">
          <h2 class="modal-title h5">{{ title }}</h2>
        </div>
        <div class="modal-body">
          <input
            v-model="model"
            class="form-control form-control-lg home-input"
            maxlength="24"
            placeholder="Tên hiển thị (2-24 ký tự)"
            @keyup.enter="$emit('submit')"
          />
          <p v-if="error" class="text-danger small mt-2 mb-0">{{ error }}</p>
        </div>
        <div class="modal-footer border-0">
          <button
            class="btn btn-primary w-100 home-btn"
            @click="$emit('submit')"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  </div>
  <div v-if="visible" class="modal-backdrop show"></div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  visible: boolean;
  title: string;
  modelValue: string;
  error: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  submit: [];
}>();

const model = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
});
</script>
