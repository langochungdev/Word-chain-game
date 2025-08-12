<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { db } from '@/utils/firebase'
import { doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { usePlayers } from '@/composables/usePlayers'
import { useChat } from '@/composables/useChat'
import { useSuggestions } from '@/composables/useSuggestions'

// ====== Khởi tạo biến chính ======
const route = useRoute()
const roomId = ref(route.params.id)
const isHost = ref(route.query.host === '1')
const myName = ref('')
const targetScore = ref()

// --- Sửa: myId cố định theo thiết bị ---
let storedId = localStorage.getItem('wordgame_myid')
if (!storedId) {
    storedId = Math.random().toString(36).slice(2)
    localStorage.setItem('wordgame_myid', storedId)
}
const myId = storedId
// --------------------------------------

const showModal = ref(true)
const winner = ref(null)
const showWinner = ref(false)
const lastWinnerAtShown = ref(null)

// ====== State chat/game ======
const messages = ref([])
const text = ref('')
const scores = ref({})
const lastWord = ref('')
const messageError = ref('')

// ====== Suggestions ======
const { suggestMode, suggestions, onInputText, applySuggestion } =
    useSuggestions()

// ====== Chat (WebRTC) ======
const {
    ready,
    readyBadge,
    send: sendRaw,
    initChat,
} = useChat(roomId, isHost, myName, myId, (msgText, fromId) =>
    onReceiveWord(msgText, fromId),
)

// ====== Players (Firestore) ======
const { players, gameStarted, confirm, startGame, readyUp } = usePlayers(
    roomId,
    isHost,
    myId,
    myName,
    targetScore,
    initChat,
    showModal,
)

// ====== Hiển thị leader CHỈ khi đang chơi ======
const leader = computed(() => {
    if (!gameStarted.value) return null
    const arr = Object.entries(scores.value)
    if (!arr.length) return null
    return arr.sort((a, b) => b[1] - a[1])[0]
})

// ====== Đồng bộ targetScore & gameStarted từ Firestore ======
onSnapshot(doc(db, 'rooms', roomId.value), (snap) => {
    if (!snap.exists()) return
    const data = snap.data()
    targetScore.value = data?.targetScore ?? null

    if (
        !data?.gameStarted &&
        data?.winner &&
        lastWinnerAtShown.value !== data.winner.at
    ) {
        winner.value = data.winner
        lastWinnerAtShown.value = data.winner.at
        showWinner.value = true
        setTimeout(() => (showWinner.value = false), 20000)

        if (isHost.value) {
            setTimeout(
                () =>
                    updateDoc(doc(db, 'rooms', roomId.value), { winner: null }),
                20000,
            )
        }
    }

    if (data?.gameStarted === false) resetLocalGame()
})

// ====== Host tự động thấy modal khi targetScore = null ======
watch(targetScore, (val) => {
    if (isHost.value && val == null) {
        showModal.value = true
    }
})

function resetLocalGame() {
    scores.value = {}
    messages.value = []
    lastWord.value = ''
    messageError.value = ''
}

// ====== Kiểm tra từ hợp lệ ======
async function checkValidWord(rawWord) {
    const lower = rawWord.toLowerCase()
    if (!/^[a-z]+$/.test(lower)) return false
    if (lower.length < 2) return false
    if (lower.length === 2 && lower[0] === lower[1]) return false

    try {
        const res = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${lower}`,
        )
        if (!res.ok) return false
        const data = await res.json()
        if (!Array.isArray(data) || !data.length) return false

        const ALLOWED_POS = [
            'noun',
            'verb',
            'adjective',
            'adverb',
            'pronoun',
            'preposition',
            'conjunction',
            'interjection',
        ]
        const BAN_DEF =
            /^(abbreviation|initialism|acronym|proper noun|letter|symbol|prefix|suffix)\b/i

        return data.some((entry) => {
            if (
                typeof entry.word === 'string' &&
                entry.word !== entry.word.toLowerCase()
            )
                return false
            return (
                Array.isArray(entry.meanings) &&
                entry.meanings.some(
                    (m) =>
                        ALLOWED_POS.includes(
                            String(m.partOfSpeech).toLowerCase(),
                        ) &&
                        Array.isArray(m.definitions) &&
                        m.definitions.some(
                            (d) =>
                                typeof d.definition === 'string' &&
                                d.definition.length > 0 &&
                                !BAN_DEF.test(d.definition),
                        ),
                )
            )
        })
    } catch {
        return false
    }
}

function onReceiveWord(word, fromId) {
    if (!gameStarted.value) return
    if (messages.value.some((m) => m.text.toLowerCase() === word.toLowerCase()))
        return
    if (!gameStarted.value) return
    lastWord.value = word
    scores.value[fromId] = (scores.value[fromId] || 0) + word.length
    const sender = players.value.find((p) => p.id === fromId)?.name || fromId
    messages.value.push({ from: sender, text: word })
}

async function sendWord() {
    const word = text.value.trim().toLowerCase()
    if (messages.value.some((m) => m.text.toLowerCase() === word)) {
        messageError.value = 'Từ này đã được dùng trước đó.'
        return
    }
    if (!word) return
    if (!gameStarted.value) {
        messageError.value = 'Chưa bắt đầu ván mới.'
        return
    }
    messageError.value = ''

    if (messages.value.length === 0 && !isHost.value) {
        messageError.value = 'Chỉ chủ phòng được gửi từ đầu tiên!'
        return
    }

    if (lastWord.value) {
        const lastChar = lastWord.value.slice(-1).toLowerCase()
        const firstChar = word[0].toLowerCase()
        if (lastChar !== firstChar) {
            messageError.value = `Từ phải bắt đầu bằng "${lastChar.toUpperCase()}"`
            return
        }
    }

    const isValid = await checkValidWord(word)
    if (!isValid) {
        messageError.value = 'Từ không hợp lệ theo từ điển.'
        return
    }

    messages.value.push({ from: myName.value, text: word })
    sendRaw(word)
    lastWord.value = word
    scores.value[myId] = (scores.value[myId] || 0) + word.length
    await updateDoc(doc(db, 'rooms', roomId.value, 'players', myId), {
        score: scores.value[myId],
    })

    if (targetScore.value && scores.value[myId] >= targetScore.value) {
        await updateDoc(doc(db, 'rooms', roomId.value), {
            winner: {
                id: myId,
                name: myName.value || myId,
                score: scores.value[myId],
                at: Date.now(),
            },
            gameStarted: false,
            targetScore: null,
        })

        for (const p of players.value) {
            await updateDoc(doc(db, 'rooms', roomId.value, 'players', p.id), {
                score: 0,
                ready: false,
            })
        }
    }
    text.value = ''
}

watch(gameStarted, async (val) => {
    if (isHost.value && val) {
        await updateDoc(doc(db, 'rooms', roomId.value), { winner: null })
    }
})
</script>

<template>
    <div class="container-fluid vh-100 d-flex flex-column app-shell">
        <!-- ==== UI phòng chờ ==== -->
        <template v-if="!gameStarted">
            <!-- Header lobby: PIN | Target bên trái, Bên phải: Số người + Winner (nếu có) -->
            <div
                class="d-flex align-items-center p-2 bg-light border-bottom sticky-top"
            >
                <!-- Bên trái -->
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span class="fw-semibold">PIN phòng:</span>
                    <span class="badge bg-dark text-white">{{ roomId }}</span>
                    <span class="chip ms-1">
                        🎯 {{ targetScore ?? 'Chưa đặt' }}
                    </span>
                </div>

                <!-- Ở giữa -->
                <div class="flex-grow-1 d-flex justify-content-center">
                    <span v-if="showWinner && winner" class="chip chip-success">
                        🏁 {{ winner.name }} ({{ winner.score }} điểm)
                    </span>
                </div>

                <!-- Bên phải -->
                <div
                    class="d-flex align-items-center gap-2 flex-wrap justify-content-end"
                >
                    <span class="fw-semibold">Số người:</span>
                    <span class="badge bg-primary text-white">
                        {{ players.length }}
                    </span>
                </div>
            </div>

            <div class="flex-grow-1 p-3 overflow-auto flex-child-fix">
                <h5 class="mb-3">Phòng chờ</h5>
                <ul
                    class="list-group list-group-flush rounded-4 shadow-sm overflow-hidden"
                >
                    <li
                        v-for="(p, i) in players"
                        :key="i"
                        class="list-group-item d-flex justify-content-between align-items-center py-2"
                    >
                        <span class="text-truncate">{{ p.name }}</span>
                        <span
                            :class="[
                                'badge rounded-pill px-3 py-2',
                                p.ready
                                    ? 'bg-success-subtle text-success-emphasis'
                                    : 'bg-secondary-subtle text-secondary-emphasis',
                            ]"
                        >
                            {{ p.ready ? 'Sẵn sàng' : 'Đang chờ' }}
                        </span>
                    </li>
                </ul>
            </div>

            <div
                class="border-top p-2 d-flex justify-content-end gap-2 sticky-bottom safe-bottom bg-body shadow-top"
            >
                <button
                    v-if="isHost"
                    class="btn btn-primary btn-lg flex-fill"
                    :disabled="!myName || !targetScore"
                    @click="startGame"
                >
                    Bắt đầu
                </button>
                <button
                    v-else
                    class="btn btn-success btn-lg flex-fill"
                    :disabled="!myName"
                    @click="readyUp"
                >
                    Sẵn sàng
                </button>
            </div>

            <!-- Modal nhập tên + targetScore -->
            <div v-if="showModal">
                <div class="modal d-block">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content rounded-4 shadow-lg">
                            <div class="modal-header border-0 pb-0">
                                <h5 class="modal-title">Nhập tên</h5>
                                <h5 v-if="isHost" class="modal-title ms-3">
                                    Nhập điểm mục tiêu
                                </h5>
                            </div>
                            <div class="modal-body">
                                <input
                                    class="form-control mb-2 form-control-lg"
                                    v-model.trim="myName"
                                    placeholder="Tên hiển thị"
                                />
                                <input
                                    v-if="isHost"
                                    type="number"
                                    class="form-control form-control-lg"
                                    v-model.number="targetScore"
                                    placeholder="Điểm mục tiêu"
                                />
                            </div>
                            <div class="modal-footer border-0 pt-0">
                                <button
                                    class="btn btn-primary btn-lg w-100"
                                    :disabled="
                                        !myName || (isHost && !targetScore)
                                    "
                                    @click="confirm"
                                >
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-backdrop show"></div>
            </div>
        </template>

        <!-- ==== UI phòng chat ==== -->
        <template v-else>
            <!-- Header chat: BÊN TRÁI = Leader | Mục tiêu | Điểm của bạn; BÊN PHẢI = Gợi ý từ | DataChannel -->
            <div
                class="d-flex justify-content-between align-items-center p-2 bg-light border-bottom sticky-top"
            >
                <!-- Left group -->
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <template v-if="leader">
                        <span class="chip">
                            🏆 Leader:
                            {{
                                players.find((p) => p.id === leader[0])?.name ||
                                leader[0]
                            }}
                            ({{ leader[1] }} điểm)
                        </span>
                        <span class="chip">🎯 Mục tiêu: {{ targetScore }}</span>
                        <span class="chip">
                            💎 Điểm của bạn: {{ scores[myId] || 0 }}
                        </span>
                    </template>
                    <template v-else>
                        <span>Room:</span>
                        <span class="badge bg-dark text-white">
                            {{ roomId }}
                        </span>
                    </template>
                </div>

                <!-- Right group -->
                <div class="d-flex align-items-center gap-3">
                    <div class="d-flex align-items-center gap-2">
                        <label class="form-check-label">Gợi ý từ</label>
                        <div class="form-check form-switch m-0">
                            <input
                                class="form-check-input"
                                type="checkbox"
                                v-model="suggestMode"
                            />
                        </div>
                    </div>
                    <div>
                        DataChannel:
                        <span class="badge" :class="readyBadge">
                            {{ ready }}
                        </span>
                    </div>
                </div>
            </div>

            <div class="flex-grow-1 overflow-auto p-3 flex-child-fix">
                <div
                    v-for="(m, i) in messages"
                    :key="i"
                    class="mb-2"
                    :class="m.from === myName ? 'text-end' : ''"
                >
                    <strong class="opacity-75">{{ m.from }}:</strong>
                    <span class="ms-1">{{ m.text }}</span>
                </div>
            </div>

            <div
                class="p-2 border-top position-relative sticky-bottom safe-bottom bg-body shadow-top composer"
            >
                <div class="input-group position-relative">
                    <input
                        v-model="text"
                        type="text"
                        class="form-control form-control-lg"
                        placeholder="Nhập từ..."
                        @input="onInputText(text)"
                        @keyup.enter="sendWord"
                        autocapitalize="none"
                        autocomplete="off"
                        autocorrect="off"
                        spellcheck="false"
                        enterkeyhint="send"
                    />
                    <button
                        class="btn btn-primary btn-lg"
                        type="button"
                        @click="sendWord"
                    >
                        Gửi
                    </button>

                    <!-- Danh sách gợi ý -->
                    <ul
                        v-if="suggestions.length"
                        class="list-group position-absolute w-100 suggestions"
                    >
                        <li
                            v-for="(s, i) in suggestions"
                            :key="i"
                            class="list-group-item list-group-item-action py-2"
                        >
                            {{ s }}
                        </li>
                    </ul>
                </div>
                <div v-if="messageError" class="text-danger mt-1 small">
                    {{ messageError }}
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
/* Nền app + safe-area */
.app-shell {
    background: var(--app-bg, #f8f9fa);
    padding-bottom: max(0px, env(safe-area-inset-bottom));
    padding-top: max(0px, env(safe-area-inset-top));
}
/* Cho phép flex-child cuộn đúng cách */
.flex-child-fix {
    min-height: 0;
}

/* Chip hiển thị ngắn gọn trong header */
.chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 999px;
    font-size: 0.9rem;
    line-height: 1;
    background: rgba(0, 0, 0, 0.06);
    color: inherit;
    white-space: nowrap;
}
.chip-success {
    background: rgba(25, 135, 84, 0.12);
    color: #198754;
}

/* Thẩm mỹ chung */
.rounded-4 {
    border-radius: 1rem !important;
}
.shadow-top {
    box-shadow: 0 -6px 16px rgba(0, 0, 0, 0.06);
}
.soft-divider {
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

/* Composer */
.composer {
    z-index: 30;
}
.safe-bottom {
    padding-bottom: calc(0.25rem + env(safe-area-inset-bottom));
}

/* Suggestions thẩm mỹ + không che chat */
.suggestions {
    bottom: calc(100% + 0.375rem);
    left: 0;
    right: 0;
    max-height: 40vh;
    overflow: auto;
    border-radius: 0.75rem;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
    z-index: 1000;
}
.input-group.position-relative {
    position: relative;
}

/* Nút và input lớn cho mobile */
.btn-lg,
.form-control-lg {
    min-height: 48px;
    border-radius: 1rem;
}
</style>
