<template>
  <div v-if="visible" class="modal d-block" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header border-0">
          <h2 class="modal-title h5">{{ title }}</h2>
        </div>
        <div class="modal-body">
          <input
            v-model="model"
            class="form-control form-control-lg"
            maxlength="24"
            placeholder="Ten hien thi (2-24 ky tu)"
            @keyup.enter="$emit('submit')"
          />
          <p v-if="error" class="text-danger small mt-2 mb-0">{{ error }}</p>
        </div>
        <div class="modal-footer border-0">
          <button class="btn btn-primary w-100" @click="$emit('submit')">
            Xac nhan
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
