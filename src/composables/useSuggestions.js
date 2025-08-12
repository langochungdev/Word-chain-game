import { ref } from 'vue'

export function useSuggestions() {
  const suggestMode = ref(false)
  const suggestions = ref([])

  const fetchSuggestions = async (query) => {
    if (!suggestMode.value || query.length < 3) {
      suggestions.value = []
      return
    }
    try {
      const res = await fetch(`https://api.datamuse.com/words?sp=${query}*&max=20`)
      const data = await res.json()
      const sorted = data
        .map((item) => item.word)
        .sort((a, b) => a.length - b.length)
        .slice(0, 3)
      suggestions.value = sorted
    } catch (e) {
      console.error(e)
      suggestions.value = []
    }
  }

  const onInputText = (text) => {
    fetchSuggestions(text.trim().toLowerCase())
  }

  const applySuggestion = (word, textRef) => {
    textRef.value = word
    suggestions.value = []
  }

  return { suggestMode, suggestions, onInputText, applySuggestion }
}
