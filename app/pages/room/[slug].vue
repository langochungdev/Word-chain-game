<template>
  <main v-if="roomState" class="container-fluid h-100dvh app-shell">
    <WordChainHeader
      :room-id="roomSlug"
      :target-score="targetScore"
      :suggest-on="suggestOn"
      :show-winner="showWinner"
      :winner="winner"
      @update:suggestOn="suggestOn = $event"
      @open-target="openTargetDialog"
      @reset-round="resetGameRound"
      @close-winner="closeWinner"
      @go-home="goHomeFromRoom"
    />

    <div class="row g-0 main-row" style="height: 100%">
      <WordChainPlayersDesktop
        :sorted-players="sortedPlayers"
        :player-count="players.length"
        :my-id="myId"
        :max-score="maxScore"
        :score-of="scoreOf"
      />

      <WordChainPlayersOffcanvas
        :players="players"
        :my-id="myId"
        :max-score="maxScore"
        :score-of="scoreOf"
      />

      <WordChainChatSection
        :my-name="myName"
        :my-id="myId"
        :scores="displayScoresMap"
        :messages="chatMessages"
        :max-score="maxScore"
        :show-winner="showWinner"
        :suggest-on="suggestOn"
        :suggesting="suggesting"
        :suggestions="suggestions"
        :target-score="targetScore"
        :message-error="uiError"
        :text="messageInput"
        :is-top-sender="isTopSender"
        @update:text="messageInput = $event"
        @pick-suggestion="pickSuggestion"
        @send-word="sendChat"
      />
    </div>

    <WordChainJoinModal
      :show-modal="profileReady && !hasName && !profileError"
      :name="nameInput"
      @update:name="nameInput = $event"
      @confirm="submitName"
    />
  </main>

  <main v-else class="container py-4" style="min-height: 100dvh">
    <div v-if="roomLoading" class="d-flex align-items-center gap-2">
      <div class="spinner-border spinner-border-sm" role="status"></div>
      <span>Dang tai du lieu phong...</span>
    </div>
    <div v-else class="alert alert-warning" role="alert">
      {{ roomError || "Phong khong ton tai" }}
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { usePresence } from "~/composables/usePresence";
import { useProfile } from "~/composables/useProfile";
import { useRoom } from "~/composables/useRoom";
import { useRooms } from "~/composables/useRooms";
import { useLocalDictionary } from "~/composables/word-chain/useLocalDictionary";
import { useWordChainSuggestions } from "~/composables/word-chain/useWordChainSuggestions";

type RoomState = {
  hostUid: string;
  hostName: string;
  status: string;
  playerCount: number;
  maxPlayers: number;
  gameState?: {
    targetScore?: number;
    lastWord?: string;
    roundId?: number;
    winner?: {
      uid?: string;
      name?: string;
      score?: number;
    } | null;
  };
};

type MemberState = {
  uid: string;
  displayName: string;
  score: number;
};

type MessageState = {
  uid: string;
  displayName: string;
  text: string;
  roundId?: number;
};

type SuggestionItem = {
  word: string;
};

type WinnerState = {
  name: string;
  score: number;
} | null;

type OptimisticMessageState = {
  uid: string;
  displayName: string;
  text: string;
  roundId: number;
  points: number;
};

const route = useRoute();
const router = useRouter();
const normalizedSlug = String(route.params.slug || "")
  .replace(/\D/g, "")
  .slice(0, 4);
const roomSlug = normalizedSlug.length === 4 ? normalizedSlug : "0000";

const {
  uid,
  name,
  hasName,
  profileReady,
  profileError,
  bootstrapProfile,
  saveName,
} = useProfile();
const {
  room,
  members,
  messages,
  roomLoading,
  roomError,
  subscribeRoomData,
  joinRoom,
  sendMessage,
  setTargetScore,
  resetRound,
  leaveRoom,
} = useRoom(roomSlug);
const { cleanupStaleRooms } = useRooms();
const { startPresence, stopPresence, presenceError } = usePresence();

const messageInput = ref("");
const nameInput = ref("");
const nameError = ref("");
const actionError = ref("");
const joined = ref(false);
const suggestOn = ref(false);
const suggestions = ref<SuggestionItem[]>([]);
const suggesting = ref(false);
const sendingWord = ref(false);
const showWinner = ref(false);
const winner = ref<WinnerState>(null);
const optimisticMessage = ref<OptimisticMessageState | null>(null);
const leavingToHome = ref(false);
let unsubscribeRoom: (() => void) | null = null;
let staleCleanupTicker: ReturnType<typeof setInterval> | null = null;

const { has: hasDictionaryWord } = useLocalDictionary();

const roomState = computed(() => room.value as RoomState | null);
const memberList = computed(() => members.value as MemberState[]);
const messageList = computed(() => messages.value as MessageState[]);
const myId = computed(() => uid.value || "");
const myName = computed(() => name.value || "");
const isHost = computed(() => roomState.value?.hostUid === uid.value);
const players = computed(() =>
  memberList.value.map((member) => ({
    id: member.uid,
    name: member.displayName,
  })),
);
const scoresMap = computed<Record<string, number>>(() => {
  const next: Record<string, number> = {};
  for (const member of memberList.value) {
    next[member.uid] = Number(member.score || 0);
  }
  return next;
});
const displayScoresMap = computed<Record<string, number>>(() => {
  const next = { ...scoresMap.value };
  const pending = optimisticMessage.value;

  if (pending?.uid) {
    next[pending.uid] = Number(next[pending.uid] || 0) + pending.points;
  }

  return next;
});
const maxScore = computed(() => {
  const values = Object.values(displayScoresMap.value).map(Number);
  return values.length ? Math.max(...values) : 0;
});
const targetScore = computed(() =>
  Number(roomState.value?.gameState?.targetScore || 0),
);
const currentRoundId = computed(() =>
  Number(roomState.value?.gameState?.roundId || 0),
);
const roundMessages = computed(() =>
  targetScore.value > 0
    ? messageList.value.filter(
        (item) => Number(item.roundId || 0) === currentRoundId.value,
      )
    : [],
);
const sortedPlayers = computed(() =>
  [...players.value].sort((a, b) => scoreOf(b.id) - scoreOf(a.id)),
);
const chatMessages = computed(() => {
  const base = [...roundMessages.value].reverse().map((item) => ({
    from: item.displayName,
    text: item.text,
  }));

  const pending = optimisticMessage.value;
  if (!pending) return base;

  const committed = roundMessages.value.some(
    (item) =>
      item.uid === pending.uid &&
      normalizeWord(item.text) === pending.text &&
      Number(item.roundId || 0) === pending.roundId,
  );

  if (committed) return base;

  return [
    ...base,
    {
      from: pending.displayName,
      text: pending.text,
    },
  ];
});
const usedWords = computed(() => {
  const set = new Set<string>();
  for (const item of roundMessages.value) {
    const normalized = normalizeWord(item.text);
    if (normalized) set.add(normalized);
  }
  return set;
});
const lastAcceptedWord = computed(() => {
  const fromRoom = normalizeWord(
    String(roomState.value?.gameState?.lastWord || ""),
  );
  if (fromRoom) return fromRoom;
  const latestRound = roundMessages.value[0];
  return normalizeWord(String(latestRound?.text || ""));
});
const uiError = computed(() => {
  if (nameError.value) return nameError.value;
  if (actionError.value) return actionError.value;
  if (profileError.value) return profileError.value;
  if (presenceError.value) return presenceError.value;
  return roomError.value;
});

const { pickSuggestion, stopSuggestions } = useWordChainSuggestions({
  text: messageInput,
  suggestOn,
  suggestions,
  suggesting,
});

function scoreOf(id: string) {
  return Number(displayScoresMap.value[id] || 0);
}

function isTopSender(displayName: string) {
  const player = players.value.find((item) => item.name === displayName);
  return Boolean(player && scoreOf(player.id) === maxScore.value);
}

function mapError(error: unknown) {
  const firebaseError = error as { code?: string };
  if (firebaseError?.code === "permission-denied") {
    return "Khong du quyen thao tac Firestore. Kiem tra lai firestore.rules.";
  }
  if (firebaseError?.code === "unauthenticated") {
    return "Ban chua dang nhap Firebase Auth.";
  }
  if (!(error instanceof Error)) return "Co loi khong xac dinh";
  if (error.message === "ROOM_NOT_FOUND") return "Phong khong ton tai";
  if (error.message === "ROOM_NOT_OPEN") return "Phong da dong";
  if (error.message === "ROOM_FULL") return "Phong da day";
  if (error.message === "NOT_IN_ROOM") return "Ban khong nam trong phong";
  if (error.message === "NOT_HOST") return "Chi host moi duoc thay doi target";
  if (error.message === "TARGET_NOT_SET")
    return "Vui lòng nhập target score trước khi chơi.";
  if (error.message === "ROUND_NOT_STARTED") return "Vong choi chua bat dau.";
  if (error.message === "ROUND_FINISHED")
    return "Vong choi da ket thuc. Bam Reset de choi lai.";
  if (error.message === "MESSAGE_EMPTY") return "Nội dung trống";
  if (error.message === "WORD_EMPTY") return "Nội dung trống";
  if (error.message === "WORD_TOO_SHORT") return "Từ phải có ít nhất 2 ký tự";
  if (error.message === "WORD_INVALID_CHAR")
    return "Từ chỉ được chứa chữ cái (a-z)";
  if (error.message === "WORD_DUPLICATE")
    return "Từ này đã được sử dụng trước đó";
  if (error.message === "WORD_CHAIN_MISMATCH") {
    const expected = lastAcceptedWord.value
      ? lastAcceptedWord.value[lastAcceptedWord.value.length - 1]
      : "";
    return expected
      ? `Từ phải bắt đầu bằng "${expected}"`
      : "Từ không hợp lệ theo luật nối chữ";
  }
  if (error.message === "DICTIONARY_NOT_FOUND")
    return "Từ này không tồn tại trong từ điển";
  return error.message;
}

function normalizeWord(raw: string) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function validateWordForSend(rawInput: string) {
  const normalized = normalizeWord(rawInput);
  if (!normalized) throw new Error("WORD_EMPTY");
  if (!/^[a-z]+$/.test(normalized)) throw new Error("WORD_INVALID_CHAR");
  if (normalized.length < 2) throw new Error("WORD_TOO_SHORT");

  const currentLastWord = lastAcceptedWord.value;
  if (currentLastWord) {
    const expectedChar = currentLastWord[currentLastWord.length - 1];
    if (normalized[0] !== expectedChar) throw new Error("WORD_CHAIN_MISMATCH");
  }

  if (usedWords.value.has(normalized)) throw new Error("WORD_DUPLICATE");

  if (!hasDictionaryWord(normalized)) {
    throw new Error("DICTIONARY_NOT_FOUND");
  }

  return normalized;
}

function pushActionError(message: string) {
  actionError.value = message;
  if (!import.meta.client) return;
  window.setTimeout(() => {
    if (actionError.value === message) {
      actionError.value = "";
    }
  }, 1500);
}

async function ensureJoined() {
  if (joined.value || !uid.value || !name.value) return;
  await joinRoom({ uid: uid.value, name: name.value });
  startPresence({ slug: roomSlug, profileUid: uid.value });
  joined.value = true;
}

async function submitName() {
  nameError.value = "";
  const validationError = saveName(nameInput.value);
  if (validationError) {
    nameError.value = validationError;
    return;
  }
  try {
    await ensureJoined();
  } catch (error) {
    pushActionError(mapError(error));
  }
}

async function sendChat() {
  if (sendingWord.value) return;
  if (optimisticMessage.value) {
    pushActionError("Dang dong bo tin nhan truoc, vui long thu lai.");
    return;
  }
  if (targetScore.value === 0) {
    pushActionError("Vui lòng nhập target score trước khi chơi.");
    return;
  }
  if (roomState.value?.gameState?.winner) {
    pushActionError("Vong choi da ket thuc. Bam Reset de choi lai.");
    return;
  }
  if (!uid.value || !name.value) {
    pushActionError("Khong the khoi tao profile tu Firebase Auth.");
    return;
  }

  sendingWord.value = true;
  actionError.value = "";

  try {
    const normalizedWord = validateWordForSend(messageInput.value);
    optimisticMessage.value = {
      uid: uid.value,
      displayName: name.value,
      text: normalizedWord,
      roundId: currentRoundId.value,
      points: normalizedWord.length,
    };
    messageInput.value = "";
    await sendMessage({ uid: uid.value, name: name.value }, normalizedWord);
  } catch (error) {
    optimisticMessage.value = null;
    pushActionError(mapError(error));
  } finally {
    sendingWord.value = false;
  }
}

async function openTargetDialog() {
  if (!import.meta.client) return;
  const raw = window.prompt(
    "Nhập target score",
    String(targetScore.value || 0),
  );
  if (raw == null) return;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return;

  actionError.value = "";
  try {
    await setTargetScore(uid.value, Math.floor(parsed));
  } catch (error) {
    pushActionError(mapError(error));
  }
}

async function resetGameRound() {
  if (!uid.value) {
    pushActionError("Khong the khoi tao profile tu Firebase Auth.");
    return;
  }

  actionError.value = "";
  optimisticMessage.value = null;
  showWinner.value = false;
  winner.value = null;

  try {
    await resetRound(uid.value);
  } catch (error) {
    pushActionError(mapError(error));
  }
}

async function closeWinner() {
  showWinner.value = false;

  if (!isHost.value || !uid.value) return;
  if (!roomState.value?.gameState?.winner) return;

  try {
    await resetRound(uid.value);
  } catch (error) {
    pushActionError(mapError(error));
  }
}

async function goHomeFromRoom() {
  if (leavingToHome.value) return;
  leavingToHome.value = true;

  try {
    if (uid.value) {
      const profileUid = uid.value;
      await stopPresence().catch(() => undefined);
      await leaveRoom(profileUid, { deleteRoomWhenEmpty: true });
      joined.value = false;
    }
  } catch (error) {
    pushActionError(mapError(error));
  } finally {
    await router.push("/");
  }
}

watch(
  () => roomState.value?.gameState?.winner,
  (nextWinner) => {
    const candidate = nextWinner as { name?: string; score?: number } | null;
    if (!candidate?.name) {
      showWinner.value = false;
      winner.value = null;
      return;
    }

    winner.value = {
      name: String(candidate.name),
      score: Number(candidate.score || 0),
    };
    showWinner.value = true;
  },
  { immediate: true },
);

watch(roundMessages, (items) => {
  const pending = optimisticMessage.value;
  if (!pending) return;

  const committed = items.some(
    (item) =>
      item.uid === pending.uid &&
      normalizeWord(item.text) === pending.text &&
      Number(item.roundId || 0) === pending.roundId,
  );

  if (committed) {
    optimisticMessage.value = null;
  }
});

onMounted(async () => {
  if (normalizedSlug.length !== 4) {
    await router.replace("/");
    return;
  }

  unsubscribeRoom = subscribeRoomData();
  await bootstrapProfile();
  nameInput.value = name.value;

  cleanupStaleRooms(0.05).catch(() => undefined);
  staleCleanupTicker = setInterval(() => {
    cleanupStaleRooms(0.05).catch(() => undefined);
  }, 60000);

  if (!hasName.value) return;

  try {
    await ensureJoined();
  } catch (error) {
    pushActionError(mapError(error));
  }
});

onBeforeUnmount(() => {
  stopSuggestions();

  if (staleCleanupTicker) {
    clearInterval(staleCleanupTicker);
    staleCleanupTicker = null;
  }

  if (unsubscribeRoom) {
    unsubscribeRoom();
    unsubscribeRoom = null;
  }

  if (uid.value && joined.value && !leavingToHome.value) {
    stopPresence().catch(() => undefined);
    leaveRoom(uid.value, { deleteRoomWhenEmpty: true }).catch(() => undefined);
  }
});
</script>
