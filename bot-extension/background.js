let autoPlaying = false
let intervalId = null
const validWordCache = new Map()

chrome.action.onClicked.addListener((tab) => {
    if (!tab?.id) return
    if (autoPlaying) {
        autoPlaying = false
        if (intervalId) clearInterval(intervalId)
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                if (window.__autoInterval) clearInterval(window.__autoInterval)
                window.__usedWords = new Set()
                window.__validWordCache = new Map()
                console.log('[BOT] Dừng bot và reset usedWords')
                alert('Bot đã dừng')
            }
        })
    } else {
        autoPlaying = true
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: startAutoPlay
        })
    }
})

function startAutoPlay() {
    const usedWords = window.__usedWords || new Set()
    window.__usedWords = usedWords
    const validWordCache = window.__validWordCache || new Map()
    window.__validWordCache = validWordCache

    // Lấy tên của mình
    const myName = document.querySelector('.chat-subheader .neon-name')?.textContent.trim() || ''
    let currentRequiredChar = null
    let lastFailedWord = null

    const fallbackWords = [
        'apple','banana','orange','table','chair','window','water','light','house','music',
        'elephant','energy','engine','earth','east','egg','ear','ice','ill','ink','owl','ox','ant'
    ]

    async function getCharFromError() {
        let el = null
        // thử tối đa 5 lần, ưu tiên error-float
        for (let i = 0; i < 5; i++) {
            el = document.querySelector('.error-float, .text-danger.mt-1.small')
            if (el && el.textContent.trim()) break
            await new Promise(r => setTimeout(r, 60))
        }
        if (!el) return null

        const text = el.textContent.trim()
        // bắt ký tự trong dấu ngoặc kép
        const match = text.match(/[“”"‘’']\s*([a-zA-Z])\s*[“”"‘’']/)
        if (match) {
            const newChar = match[1].toLowerCase()
            if (newChar !== currentRequiredChar) {
                currentRequiredChar = newChar
                for (let w of [...usedWords]) {
                    if (w.startsWith(currentRequiredChar)) usedWords.delete(w)
                }
            }
            return newChar
        }
        return null
    }

    function extractLastLatinChar(str) {
        const m = (str || '').toLowerCase().match(/[a-z](?=[^a-z]*$)/i)
        return m ? m[0].toLowerCase() : null
    }

    function getLastCharFromMessage() {
        const all = Array.from(document.querySelectorAll('.msg-row'))
        if (!all.length) return null
        for (let i = 0; i < all.length; i++) {
            const row = all[i]
            if (row.classList.contains('me')) continue
            const text = row.querySelector('.msg-text')?.innerText || ''
            const ch = extractLastLatinChar(text)
            if (ch) return ch
        }
        for (let i = all.length - 1; i >= 0; i--) {
            const row = all[i]
            if (row.classList.contains('me')) continue
            const text = row.querySelector('.msg-text')?.innerText || ''
            const ch = extractLastLatinChar(text)
            if (ch) return ch
        }
        return null
    }

    async function getSuggestions(lastChar) {
        let words = fallbackWords.filter(w => w[0] === lastChar)
        if (words.length < 3) {
            try {
                const res = await fetch(`https://api.datamuse.com/words?sp=${lastChar}*&max=20`)
                if (res.ok) {
                    const data = await res.json()
                    const apiWords = Array.isArray(data) ? data.map(d => (d.word || '').toLowerCase()) : []
                    words = words.concat(apiWords.filter(w => w[0] === lastChar && !words.includes(w)))
                }
            } catch {}
        }
        return words
    }

    async function isValidWord(word, lastChar, skipDictionary = false, ignoreUsed = false) {
        if (!/^[a-z]+$/.test(word)) return false
        if (word.length < 2) return false
        if (!ignoreUsed && usedWords.has(word)) return false
        if (word[0] !== lastChar) return false
        if (skipDictionary) return true
        if (validWordCache.has(word)) return validWordCache.get(word)
        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
            if (!res.ok) {
                validWordCache.set(word, false)
                return false
            }
            const data = await res.json()
            const valid = Array.isArray(data) && data.length > 0
            validWordCache.set(word, valid)
            return valid
        } catch {
            validWordCache.set(word, false)
            return false
        }
    }

    async function sendWord(word) {
        const input = document.querySelector('#composer-input')
        const btn = document.querySelector('.btn.btn-primary.btn-lg')
        if (!input || !btn) return
        input.value = word
        input.dispatchEvent(new Event('input', { bubbles: true }))
        btn.click()
        usedWords.add(word)
        lastFailedWord = null
    }

    async function playTurn() {
        await new Promise(r => setTimeout(r, 180))

        let lastChar = await getCharFromError()
        let skipDict = false
        let ignoreUsed = false

        if (lastChar) {
            ignoreUsed = true
        } else if (currentRequiredChar) {
            lastChar = currentRequiredChar
            skipDict = true
        } else {
            lastChar = getLastCharFromMessage()
        }

        if (!lastChar) return
        currentRequiredChar = lastChar

        let candidates = await getSuggestions(lastChar)
        if (ignoreUsed && lastFailedWord) {
            candidates = candidates.filter(w => w !== lastFailedWord)
        }

        candidates = candidates
            .filter(w => !usedWords.has(w))
            .sort((a, b) => {
                const aIsFallback = fallbackWords.includes(a) ? -1 : 1
                const bIsFallback = fallbackWords.includes(b) ? -1 : 1
                if (aIsFallback !== bIsFallback) return aIsFallback - bIsFallback
                return a.length - b.length
            })

        if (!candidates.length || candidates.every(w => usedWords.has(w))) {
            for (let w of [...usedWords]) {
                if (w.startsWith(lastChar)) usedWords.delete(w)
            }
        }

        let wordToSend = null
        for (const w of candidates) {
            if (await isValidWord(w, lastChar, skipDict, ignoreUsed)) {
                wordToSend = w
                break
            }
        }

        if (!wordToSend) {
            for (const fw of [...fallbackWords].sort((a, b) => a.length - b.length)) {
                if (await isValidWord(fw, lastChar, skipDict, ignoreUsed)) {
                    wordToSend = fw
                    break
                }
            }
        }

        if (wordToSend) {
            await sendWord(wordToSend)
            if (ignoreUsed) lastFailedWord = wordToSend
        }
    }

    if (window.__autoInterval) clearInterval(window.__autoInterval)
    window.__autoInterval = setInterval(playTurn, 400)
    console.log('[BOT] Bật auto-play')
    alert('Bot đã bật tự động chơi')
}
