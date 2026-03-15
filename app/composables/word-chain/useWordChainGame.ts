import { nextTick, onBeforeUnmount, onMounted, watch } from "vue";
import { useWordChainSocket } from "~/composables/word-chain/useWordChainSocket";
import { useWordChainState } from "~/composables/word-chain/useWordChainState";
import { useWordChainSuggestions } from "~/composables/word-chain/useWordChainSuggestions";

export function useWordChainGame() {
  const state = useWordChainState();
  const socket = useWordChainSocket({
    roomId: state.roomId,
    myId: state.myId,
    myName: state.myName,
  });

  const { clearSuggestions, pickSuggestion, stopSuggestions } =
    useWordChainSuggestions({
      text: state.text,
      suggestOn: state.suggestOn,
      suggestions: state.suggestions,
      suggesting: state.suggesting,
    });

  const usedWords = new Set();
  const respondedHello = new Set();
  let snapshotTimer = null;
  let exitHandled = false;
  let targetWatcherReady = false;

  function showTransientError(message) {
    state.messageError.value = message;
    setTimeout(() => {
      state.messageError.value = "";
    }, 1500);
  }

  function sendRoom(payload) {
    socket.sendRoom(payload);
  }

  function sendWordToRoom(content) {
    socket.sendChat(content);
  }

  function sendDirectSnapshot() {
    sendRoom({
      type: "snapshot",
      targetScore: state.targetScore.value,
      players: [...state.players],
      scores: { ...state.scores },
    });
  }

  function scheduleSnapshotBroadcast() {
    if (snapshotTimer) clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(() => {
      sendDirectSnapshot();
    }, 120);
  }

  function broadcastHello() {
    sendRoom({
      type: "hello",
      players: [{ id: state.myId, name: state.myName.value }],
    });
  }

  function broadcastDelta() {
    sendRoom({
      type: "delta",
      targetScore: state.targetScore.value,
      players: [{ id: state.myId, name: state.myName.value }],
    });
  }

  function broadcastScoreDelta() {
    sendRoom({ type: "score", scores: { [state.myId]: state.scores[state.myId] || 0 } });
  }

  function broadcastLeave() {
    sendRoom({ type: "leave", players: [{ id: state.myId }] });
  }

  function onRoomMessage(msg) {
    state.messages.push({ from: msg.senderId, text: msg.content });
    if (msg.content) {
      usedWords.add(String(msg.content).trim().toLowerCase());
    }
  }

  function onRoomHistory(list) {
    state.messages.splice(
      0,
      state.messages.length,
      ...list.map((m) => ({ from: m.senderId, text: m.content })),
    );

    list.forEach((m) => {
      if (m && m.content) {
        usedWords.add(String(m.content).trim().toLowerCase());
      }
    });
  }

  function onRoomInfo(info) {
    if (info.type === "error" && info.origin === state.myId) {
      showTransientError(info.msg);
      return;
    }

    if (info.type === "reset") {
      state.messages.splice(0, state.messages.length);
      state.targetScore.value = 0;
      for (const key in state.scores) delete state.scores[key];
      clearSuggestions();
      usedWords.clear();

      if (info.winner) {
        state.showWinner.value = true;
        state.winner.value = info.winner;
        setTimeout(() => {
          state.showWinner.value = false;
          state.winner.value = null;
        }, 20000);
      }
      return;
    }

    if (info.origin === state.myId) return;

    let learned = false;

    if (
      typeof info.targetScore === "number" &&
      info.targetScore !== state.targetScore.value
    ) {
      state.targetScore.value = info.targetScore;
      learned = true;
    }

    if (Array.isArray(info.players) && state.mergePlayers(info.players)) {
      learned = true;
    }

    if (
      info.scores &&
      typeof info.scores === "object" &&
      state.mergeScores(info.scores)
    ) {
      learned = true;
    }

    if (info.type === "leave" && Array.isArray(info.players)) {
      for (const p of info.players) state.removePlayerById(p.id);
    }

    if (
      info.type === "hello" &&
      info.origin &&
      !respondedHello.has(info.origin)
    ) {
      respondedHello.add(info.origin);
      sendDirectSnapshot();
    }

    if (learned && info.type !== "snapshot") {
      scheduleSnapshotBroadcast();
    }
  }

  function connectWS() {
    socket.connect({
      onConnected: socket.requestHistory,
      onDisconnected: () => {
        state.messageError.value = "";
      },
      onRoomMessage,
      onRoomInfo,
      onRoomHistory,
      onSocketError: showTransientError,
    });
  }

  function confirm() {
    state.myName.value = state.tempName.value;
    state.showModal.value = false;

    if (state.idxById(state.myId) < 0) {
      state.players.push({ id: state.myId, name: state.myName.value });
    }

    if (state.scores[state.myId] == null) {
      state.scores[state.myId] = 0;
    }

    broadcastHello();
  }

  function openTargetDialog() {
    const raw = window.prompt(
      "Nhập target score",
      String(state.targetScore.value || 0),
    );
    if (raw == null) return;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    state.targetScore.value = Math.floor(n);
    broadcastDelta();
  }

  async function isValidWord(word) {
    const newWord = word.trim().toLowerCase();

    if (!newWord) {
      state.messageError.value = "Nội dung trống";
      return false;
    }

    if (!/^[a-zA-Z]+$/.test(newWord)) {
      state.messageError.value = "Từ chỉ được chứa chữ cái (a-z)";
      return false;
    }

    if (newWord.length < 2) {
      state.messageError.value = "Từ phải có ít nhất 2 ký tự";
      return false;
    }

    if (state.messages.length > 0) {
      const lastMsg = [...state.messages].reverse().find((m) => m.from);
      if (lastMsg) {
        const lastWord = lastMsg.text.trim().toLowerCase();
        if (newWord[0] !== lastWord[lastWord.length - 1]) {
          state.messageError.value = `Từ phải bắt đầu bằng "${lastWord[lastWord.length - 1]}"`;
          return false;
        }
      }
    }

    if (usedWords.has(newWord)) {
      state.messageError.value = "Từ này đã được sử dụng trước đó";
      return false;
    }

    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${newWord}`,
      );
      if (!res.ok) {
        state.messageError.value = "Từ này không tồn tại trong từ điển";
        return false;
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        state.messageError.value = "Từ này không tồn tại trong từ điển";
        return false;
      }
    } catch {
      state.messageError.value = "Không thể kiểm tra từ";
      return false;
    }

    return true;
  }

  function checkWinner() {
    if (state.resetting.value) return;

    const ts = Number(state.targetScore.value || 0);
    if (ts <= 0) return;

    for (const [pid, sc] of Object.entries(state.scores)) {
      const scoreNum = Number(sc);
      if (scoreNum < ts) continue;

      const wp = state.players.find((p) => p.id === pid);
      if (!wp) break;

      state.resetting.value = true;
      state.showWinner.value = true;
      state.winner.value = { id: pid, name: wp.name, score: scoreNum };

      clearSuggestions();
      usedWords.clear();
      state.messages.splice(0, state.messages.length);
      state.targetScore.value = 0;

      sendRoom({
        type: "reset",
        targetScore: 0,
        messages: [],
        winner: { id: pid, name: wp.name, score: scoreNum },
      });

      Object.keys(state.scores).forEach((k) => {
        state.scores[k] = 0;
      });

      broadcastScoreDelta();

      setTimeout(() => {
        state.resetting.value = false;
      }, 0);
      break;
    }
  }

  async function sendWord() {
    if (state.targetScore.value === 0) {
      showTransientError("Vui lòng nhập target score trước khi chơi.");
      return;
    }

    const newWord = state.text.value.trim().toLowerCase();
    const valid = await isValidWord(newWord);
    if (!valid) {
      setTimeout(() => {
        state.messageError.value = "";
      }, 1500);
      return;
    }

    usedWords.add(newWord);
    sendWordToRoom(newWord);
    state.scores[state.myId] = (state.scores[state.myId] || 0) + newWord.length;
    broadcastScoreDelta();
    checkWinner();
    state.text.value = "";
  }

  function closeWinner() {
    state.showWinner.value = false;
  }

  function startFireworks(ms = 3000) {
    const confetti = globalThis.confetti;
    if (typeof confetti !== "function") return;

    const end = Date.now() + ms;
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 } });
      confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };

    frame();
  }

  function isAlone() {
    return (
      state.players.filter((p) => p && p.id).length === 1 &&
      state.idxById(state.myId) >= 0
    );
  }

  function resetRoomNow() {
    sendRoom({ type: "reset", targetScore: 0, messages: [], winner: null });
  }

  function handleExitOnce() {
    if (exitHandled) return;
    exitHandled = true;

    if (socket.isConnected()) {
      if (isAlone()) resetRoomNow();
      broadcastLeave();
    }
  }

  function handleExitEvent() {
    handleExitOnce();
  }

  watch(state.showWinner, (v) => {
    if (v && state.winner.value) startFireworks(3000);
  });

  watch(state.messages, async () => {
    await nextTick();
    const el = document.getElementById("chat-scroll");
    if (el) el.scrollTop = el.scrollHeight;
  });

  watch(state.targetScore, (newVal, oldVal) => {
    if (newVal !== 0 || oldVal === 0) return;

    if (!targetWatcherReady) {
      targetWatcherReady = true;
      return;
    }

    clearSuggestions();
    usedWords.clear();
    state.messages.splice(0, state.messages.length);

    Object.keys(state.scores).forEach((k) => {
      state.scores[k] = 0;
    });

    sendRoom({ type: "reset", targetScore: 0, messages: [], winner: null });
    sendRoom({ type: "score", scores: { ...state.scores } });
  });

  onMounted(() => {
    connectWS();
    window.addEventListener("pagehide", handleExitEvent);
    window.addEventListener("beforeunload", broadcastLeave);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("pagehide", handleExitEvent);
    window.removeEventListener("beforeunload", broadcastLeave);

    if (snapshotTimer) clearTimeout(snapshotTimer);

    stopSuggestions();
    handleExitOnce();
    socket.disconnect();
  });

  return {
    ...state,
    ready: socket.ready,
    sendWord,
    pickSuggestion,
    openTargetDialog,
    confirm,
    closeWinner,
  };
}
