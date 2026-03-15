<template>
  <div v-if="showModal">
    <div class="modal d-block">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-4 shadow-lg">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title">Nhập tên để tham gia</h5>
          </div>
          <div class="modal-body">
            <input
              v-model.trim="nameModel"
              class="form-control mb-2 form-control-lg"
              placeholder="Tên hiển thị"
            />
          </div>
          <div class="modal-footer border-0 pt-0">
            <button
              class="btn btn-primary btn-lg w-100"
              :disabled="!nameModel"
              @click="$emit('confirm')"
            >
              Vào phòng
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop show"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  showModal: boolean;
  name: string;
}>();

const emit = defineEmits<{
  "update:name": [value: string];
  confirm: [];
}>();

const nameModel = computed({
  get: () => props.name,
  set: (value: string) => emit("update:name", value),
});
</script>
