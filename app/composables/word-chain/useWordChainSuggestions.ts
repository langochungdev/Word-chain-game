import { watch } from "vue";

export function useWordChainSuggestions({
  text,
  suggestOn,
  suggestions,
  suggesting,
}) {
  let sugTimer = null;
  let sugAbort = null;

  function clearSuggestions() {
    suggestions.value = [];
    suggesting.value = false;

    if (sugTimer) {
      clearTimeout(sugTimer);
      sugTimer = null;
    }

    if (sugAbort) {
      try {
        sugAbort.abort();
      } catch {}
      sugAbort = null;
    }
  }

  async function fetchSuggestions(q) {
    if (sugAbort) {
      try {
        sugAbort.abort();
      } catch {}
    }

    suggesting.value = true;

    try {
      sugAbort =
        typeof AbortController !== "undefined" ? new AbortController() : null;
      const opts = sugAbort ? { signal: sugAbort.signal } : {};
      const r = await fetch(
        `https://api.datamuse.com/sug?s=${encodeURIComponent(q)}&max=5`,
        opts,
      );
      if (!r.ok) throw new Error("net");
      const data = await r.json();
      suggestions.value = (Array.isArray(data) ? data : []).slice(0, 5);
    } catch {
      suggestions.value = [];
    } finally {
      suggesting.value = false;
      sugAbort = null;
    }
  }

  function pickSuggestion(word) {
    text.value = word;
    clearSuggestions();
  }

  const stopTextWatch = watch(text, (v) => {
    if (!suggestOn.value) {
      clearSuggestions();
      return;
    }

    const q = (v || "").trim().toLowerCase();
    if (q.length < 3) {
      clearSuggestions();
      return;
    }

    if (sugTimer) clearTimeout(sugTimer);
    sugTimer = setTimeout(() => fetchSuggestions(q), 200);
  });

  const stopSwitchWatch = watch(suggestOn, (on) => {
    if (!on) clearSuggestions();
  });

  function stopSuggestions() {
    stopTextWatch();
    stopSwitchWatch();
    clearSuggestions();
  }

  return {
    clearSuggestions,
    pickSuggestion,
    stopSuggestions,
  };
}
