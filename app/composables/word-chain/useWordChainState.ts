import { computed, reactive, ref } from "vue";

export function useWordChainState() {
  const roomId = ref("word-chain");
  const myName = ref("");
  const tempName = ref("");
  const showModal = ref(true);
  const myId = Math.random().toString(36).slice(2, 8);
  const resetting = ref(false);
  const targetScore = ref(0);
  const players = reactive([]);
  const messages = reactive([]);
  const text = ref("");
  const messageError = ref("");
  const scores = reactive({});
  const showWinner = ref(false);
  const winner = ref(null);
  const suggestOn = ref(false);
  const suggestions = ref([]);
  const suggesting = ref(false);

  const maxScore = computed(() => {
    const vals = Object.values(scores).map(Number);
    return vals.length ? Math.max(...vals) : 0;
  });

  const sortedPlayers = computed(() => {
    return [...players].sort((a, b) => scoreOf(b.id) - scoreOf(a.id));
  });

  function scoreOf(id) {
    return Number(scores[id] || 0);
  }

  function idxById(id) {
    return players.findIndex((p) => p.id === id);
  }

  function mergePlayers(incoming) {
    let changed = false;
    for (const p of incoming) {
      if (!p || !p.id) continue;
      const i = idxById(p.id);
      if (i >= 0) {
        const cur = players[i];
        if (cur.name !== p.name) {
          cur.name = p.name;
          changed = true;
        }
      } else {
        players.push({ id: p.id, name: p.name });
        changed = true;
      }
    }
    return changed;
  }

  function mergeScores(inScores) {
    let changed = false;
    for (const [pid, val] of Object.entries(inScores)) {
      const n = Number(val);
      if (!Number.isFinite(n)) continue;
      if (scores[pid] !== n) {
        scores[pid] = n;
        changed = true;
      }
    }
    return changed;
  }

  function removePlayerById(id) {
    const i = idxById(id);
    if (i >= 0) players.splice(i, 1);
    if (scores[id] != null) delete scores[id];
  }

  function isTopSender(name) {
    const player = players.find((p) => p.name === name);
    return Boolean(player && scoreOf(player.id) === maxScore.value);
  }

  return {
    roomId,
    myName,
    tempName,
    showModal,
    myId,
    resetting,
    targetScore,
    players,
    messages,
    text,
    messageError,
    scores,
    showWinner,
    winner,
    suggestOn,
    suggestions,
    suggesting,
    maxScore,
    sortedPlayers,
    scoreOf,
    idxById,
    mergePlayers,
    mergeScores,
    removePlayerById,
    isTopSender,
  };
}
