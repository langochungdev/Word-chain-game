import { computed } from "vue";
import { useState } from "nuxt/app";
import englishWords from "an-array-of-english-words";

const normalizedDictionary = new Set<string>();

for (const rawWord of englishWords) {
  const normalized = String(rawWord || "")
    .trim()
    .toLowerCase();

  if (!/^[a-z]+$/.test(normalized)) continue;
  if (normalized.length < 2) continue;
  normalizedDictionary.add(normalized);
}

export function useLocalDictionary() {
  const words = useState<Set<string>>(
    "word-chain.dictionary.words",
    () => new Set(normalizedDictionary),
  );
  const loading = computed(() => false);
  const error = useState<string>("word-chain.dictionary.error", () => "");

  const ready = computed(() => words.value.size > 0);

  async function preload() {
    return ready.value;
  }

  function has(word: string) {
    const normalized = String(word || "")
      .trim()
      .toLowerCase();
    if (!normalized) return false;
    return words.value.has(normalized);
  }

  return {
    ready,
    loading,
    error,
    preload,
    has,
  };
}
