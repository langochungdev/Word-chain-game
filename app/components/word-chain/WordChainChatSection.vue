<template>
  <section
    class="col-12 col-md-8 chat-panel d-flex flex-column p-0"
    style="height: 100%"
  >
    <div
      class="d-flex align-items-center gap-2 p-2 border-bottom bg-body-tertiary chat-subheader"
    >
      <span class="chip"
        >💎 Điểm của <span class="neon-name">{{ myName }}</span> :
        {{ scores[myId] || 0 }}</span
      >
    </div>

    <div
      id="chat-scroll"
      ref="chatScrollRef"
      class="p-3 chat-scroll flex-grow-1"
    >
      <div
        v-for="(m, i) in messages"
        :key="i"
        class="msg-row"
        :class="m.from === myName ? 'me' : 'other'"
      >
        <div class="msg-bubble">
          <div class="msg-text">{{ m.text }}</div>
        </div>
        <div class="msg-meta" :class="m.from === myName ? 'text-end' : ''">
          <span
            class="name"
            :class="m.from === myName ? 'neon-name' : 'neon-name-orange'"
            >{{ m.from }}</span
          >
          <span v-if="isTopSender(m.from)" style="color: red"
            >🏆{{ maxScore }}🏆</span
          >
          <span style="color: chartreuse">&nbsp;+{{ m.text.length }}</span>
        </div>
      </div>
    </div>

    <div v-if="!showWinner" class="composer border-top shadow-top">
      <div class="position-relative">
        <div
          v-if="suggestOn && (suggesting || suggestions.length)"
          class="suggest-box"
        >
          <div v-if="suggesting" class="p-2 small text-muted">
            Đang gợi ý...
          </div>
          <ul v-else class="list-group list-group-flush">
            <li
              v-for="(s, i) in suggestions"
              :key="i"
              class="list-group-item list-group-item-action py-2 d-flex justify-content-between align-items-center"
              role="button"
              @click="$emit('pick-suggestion', s.word)"
            >
              <span class="text-truncate">{{ s.word }}</span>
              <span class="small text-muted">chọn</span>
            </li>
            <li
              v-if="!suggestions.length"
              class="list-group-item py-2 small text-muted"
            >
              Không có gợi ý
            </li>
          </ul>
        </div>

        <div v-if="targetScore === 0" class="error-float">
          Vui lòng nhập target score trước khi chơi.
        </div>
        <div v-if="messageError" class="error-float">{{ messageError }}</div>

        <div class="input-group position-relative">
          <input
            id="composer-input"
            v-model="textModel"
            type="text"
            class="form-control form-control-lg chat-input"
            placeholder="Nhập tin..."
            autocomplete="off"
            :disabled="targetScore === 0"
            @keydown.enter.prevent="$emit('send-word')"
          />
          <button
            class="btn btn-primary btn-lg"
            type="button"
            :disabled="targetScore === 0"
            @click="$emit('send-word')"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";

type ChatMessage = {
  from: string;
  text: string;
};

type SuggestionItem = {
  word: string;
};

const props = defineProps<{
  myName: string;
  myId: string;
  scores: Record<string, number>;
  messages: ChatMessage[];
  maxScore: number;
  showWinner: boolean;
  suggestOn: boolean;
  suggesting: boolean;
  suggestions: SuggestionItem[];
  targetScore: number;
  messageError: string;
  text: string;
  isTopSender: (name: string) => boolean;
}>();

const emit = defineEmits<{
  "update:text": [value: string];
  "send-word": [];
  "pick-suggestion": [word: string];
}>();

const textModel = computed({
  get: () => props.text,
  set: (value: string) => emit("update:text", value),
});

const chatScrollRef = ref<HTMLElement | null>(null);

async function scrollToBottom() {
  await nextTick();
  if (!chatScrollRef.value) return;
  chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight;
}

watch(
  () => props.messages.length,
  () => {
    scrollToBottom();
  },
);

onMounted(() => {
  scrollToBottom();
});
</script>
