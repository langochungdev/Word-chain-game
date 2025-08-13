<template>
    <div class="container-fluid vh-100 d-flex flex-column app-shell">
        <!-- header -->
        <div
            class="d-flex align-items-center p-2 bg-light border-bottom sticky-top gap-2"
        >
            <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="fw-semibold">PIN phòng:</span>
                <span class="badge bg-dark text-white">{{ roomId }}</span>
            </div>
            <div class="ms-3 d-flex align-items-center gap-2 flex-wrap">
                <button
                    class="btn btn-outline-primary btn-sm"
                    @click="openTargetDialog"
                >
                    🎯 Target: {{ targetScore }}
                </button>
                <!-- Switch Gợi ý -->
                <div class="form-check form-switch m-0">
                    <input
                        class="form-check-input"
                        type="checkbox"
                        id="sugSwitch"
                        v-model="suggestOn"
                    />
                    <label class="form-check-label" for="sugSwitch">
                        Gợi ý
                    </label>
                </div>
            </div>
            <div class="flex-grow-1 text-center"></div>
            <!-- Popup Winner -->
            <div v-if="showWinner && winner" class="modal d-block text-center">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content p-4 rounded-4 shadow-lg">
                        <h3 class="mb-3">🏁 Người chiến thắng!</h3>
                        <h4>{{ winner.name }} ({{ winner.score }} điểm)</h4>
                        <button
                            class="btn btn-primary mt-3"
                            @click="closeWinner"
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
            <div v-if="showWinner" class="modal-backdrop show"></div>

            <div
                class="d-flex align-items-center gap-2 flex-wrap justify-content-end"
            >
                <span class="fw-semibold">Số người:</span>
                <span class="badge bg-primary text-white">
                    {{ players.length }}
                </span>
                <span class="ms-3">WS:</span>
                <span class="badge" :class="readyBadge">{{ ready }}</span>
            </div>
        </div>
        <div class="row g-0 flex-grow-1">
            <!-- danh sách users -->
            <div
                class="col-12 col-md-4 border-end d-flex flex-column"
                style="min-height: 0"
            >
                <div
                    class="p-2 border-bottom d-flex align-items-center justify-content-between"
                >
                    <h6 class="m-0">Người chơi</h6>
                    <span class="text-muted small">{{ players.length }}</span>
                </div>

                <div class="flex-grow-1 overflow-auto p-2">
                    <ul
                        class="list-group list-group-flush rounded-4 shadow-sm overflow-hidden"
                    >
                        <li
                            v-for="p in players"
                            :key="p.id"
                            class="list-group-item d-flex justify-content-between align-items-center py-2"
                        >
                            <span class="text-truncate me-2">{{ p.name }}</span>

                            <!-- badge điểm; tô vàng nếu đang dẫn đầu -->
                            <span
                                class="badge rounded-pill px-3 py-2"
                                :class="
                                    scoreOf(p.id) === maxScore
                                        ? 'bg-warning text-dark'
                                        : 'bg-secondary-subtle text-secondary-emphasis'
                                "
                                :title="
                                    scoreOf(p.id) === maxScore
                                        ? 'Top score'
                                        : ''
                                "
                            >
                                <span v-if="scoreOf(p.id) === maxScore">
                                    🏆
                                </span>
                                {{ scoreOf(p.id) }}
                            </span>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- header chat -->
            <div
                class="col-12 col-md-8 d-flex flex-column"
                style="min-height: 0"
            >
                <div class="d-flex align-items-center gap-2 p-2 border-bottom">
                    <span class="chip">
                        💎 Điểm của {{ myName }}: {{ scores[myId] || 0 }}
                    </span>
                </div>

                <!-- nội dung tin nhắn -->
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

                <!-- nhập nhắn tin -->
                <div
                    class="p-2 border-top position-relative sticky-bottom safe-bottom bg-body shadow-top composer"
                    v-if="!showWinner"
                >
                    <div class="position-relative">
                        <!-- Gợi ý nổi LÊN TRÊN -->
                        <div
                            v-if="
                                suggestOn && (suggesting || suggestions.length)
                            "
                            class="border rounded-3 bg-white shadow-sm overflow-hidden position-absolute w-100"
                            style="
                                bottom: 100%;
                                left: 0;
                                z-index: 1000;
                                margin-bottom: 6px;
                                max-height: 220px;
                                overflow: auto;
                            "
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
                                    @click="pickSuggestion(s.word)"
                                >
                                    <span class="text-truncate">
                                        {{ s.word }}
                                    </span>
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

                        <!-- Input + nút gửi -->
                        <div class="input-group position-relative">
                            <input
                                id="composer-input"
                                v-model="text"
                                type="text"
                                class="form-control form-control-lg"
                                placeholder="Nhập tin..."
                                @keyup.enter="sendWord"
                                autocomplete="off"
                            />
                            <button
                                class="btn btn-primary btn-lg"
                                type="button"
                                @click="sendWord"
                            >
                                Gửi
                            </button>
                        </div>
                    </div>

                    <div v-if="messageError" class="text-danger mt-1 small">
                        {{ messageError }}
                    </div>
                </div>
            </div>
        </div>

        <!-- nhập tên -->
        <div v-if="showModal">
            <div class="modal d-block">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content rounded-4 shadow-lg">
                        <div class="modal-header border-0 pb-0">
                            <h5 class="modal-title">Nhập tên để tham gia</h5>
                        </div>
                        <div class="modal-body">
                            <input
                                class="form-control mb-2 form-control-lg"
                                v-model.trim="tempName"
                                placeholder="Tên hiển thị"
                            />
                        </div>
                        <div class="modal-footer border-0 pt-0">
                            <button
                                class="btn btn-primary btn-lg w-100"
                                :disabled="!tempName"
                                @click="confirm"
                            >
                                Vào phòng
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-backdrop show"></div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'

import SockJS from 'sockjs-client/dist/sockjs'
import Stomp from 'stompjs'

const roomId = ref('word-chain')
const myName = ref('')
const tempName = ref('')
const showModal = ref(true)
const myId = Math.random().toString(36).slice(2, 8)
const resetting = ref(false)
const targetScore = ref(0)

const players = reactive([])
const messages = reactive([])
const text = ref('')
const messageError = ref('')

const scores = reactive({})
const ready = ref('disconnected')
const showWinner = ref(false)
const winner = ref(null)

const readyBadge = computed(() =>
    ready.value === 'connected'
        ? 'bg-success-subtle text-success-emphasis'
        : ready.value === 'connecting'
          ? 'bg-warning-subtle text-warning-emphasis'
          : 'bg-secondary-subtle text-secondary-emphasis',
)

let stompClient = null
const respondedHello = new Set()
let snapshotTimer = null
const maxScore = computed(() => {
    const vals = Object.values(scores).map(Number)
    return vals.length ? Math.max(...vals) : 0
})
function scoreOf(id) {
    return Number(scores[id] || 0)
}

function scheduleSnapshotBroadcast() {
    if (snapshotTimer) clearTimeout(snapshotTimer)
    snapshotTimer = setTimeout(() => {
        sendRoom({
            type: 'snapshot',
            targetScore: targetScore.value,
            players: [...players],
            scores: { ...scores },
        })
    }, 120)
}

function connectWS() {
    ready.value = 'connecting'

    const WS_BASE = import.meta.env.PROD
        ? 'https://word-chain-game-backend-production.up.railway.app/ws'
        : location.protocol === 'https:'
          ? 'https://word-chain-game-backend-production.up.railway.app/ws'
          : 'http://localhost:8080/ws' // backend dev

    const sock = new SockJS(WS_BASE) // KHÔNG dùng http khi trang đang https
    stompClient = Stomp.over(sock)
    stompClient.debug = null
    stompClient.connect(
        {},
        () => {
            ready.value = 'connected'

            // CHAT MESSAGES: chỉ parse và push tin nhắn
            stompClient.subscribe(`/topic/room.${roomId.value}`, (frame) => {
                const msg = JSON.parse(frame.body)
                messages.push({ from: msg.senderId, text: msg.content })
            })

            // ROOM INFO: xử lý reset + sync state
            stompClient.subscribe(
                `/topic/room-info.${roomId.value}`,
                (frame) => {
                    const info = safeParse(frame.body)
                    if (!info) return

                    // reset phải xử lý NGAY và cho tất cả client
                    if (info.type === 'reset') {
                        messages.splice(0, messages.length)
                        targetScore.value = 0
                        for (const key in scores) delete scores[key]

                        // NEW: dọn state gợi ý + lịch sử từ
                        clearSuggestions()
                        usedWords.clear()

                        if (info.winner) {
                            showWinner.value = true
                            winner.value = info.winner
                            setTimeout(() => {
                                showWinner.value = false
                                winner.value = null
                            }, 20000)
                        }
                        return
                    }

                    // bỏ qua echo của chính mình
                    if (info.origin === myId) return

                    let learned = false

                    if (
                        typeof info.targetScore === 'number' &&
                        info.targetScore !== targetScore.value
                    ) {
                        targetScore.value = info.targetScore
                        learned = true
                    }

                    if (Array.isArray(info.players)) {
                        if (mergePlayers(info.players)) learned = true
                    }

                    if (info.scores && typeof info.scores === 'object') {
                        if (mergeScores(info.scores)) learned = true
                    }

                    if (info.type === 'leave' && Array.isArray(info.players)) {
                        for (const p of info.players) removePlayerById(p.id)
                    }

                    if (
                        info.type === 'hello' &&
                        info.origin &&
                        !respondedHello.has(info.origin)
                    ) {
                        respondedHello.add(info.origin)
                        sendDirectSnapshot()
                    }

                    if (learned && info.type !== 'snapshot') {
                        scheduleSnapshotBroadcast()
                    }
                },
            )
        },
        () => (ready.value = 'disconnected'),
    )
}

function safeParse(s) {
    try {
        return JSON.parse(s)
    } catch {
        return null
    }
}
function sendWSMessage(content) {
    if (!stompClient || !stompClient.connected) return
    stompClient.send(
        '/app/chat.send',
        {},
        JSON.stringify({
            roomId: roomId.value,
            senderId: myName.value || myId,
            content,
        }),
    )
}
function sendRoom(payload) {
    if (!stompClient || !stompClient.connected) return
    stompClient.send(
        '/app/room.update',
        {},
        JSON.stringify({ origin: myId, roomId: roomId.value, ...payload }),
    )
}
function sendDirectSnapshot() {
    sendRoom({
        type: 'snapshot',
        targetScore: targetScore.value,
        players: [...players],
        scores: { ...scores },
    })
}
function broadcastHello() {
    sendRoom({
        type: 'hello',
        players: [{ id: myId, name: myName.value }],
        // targetScore: targetScore.value,
    })
}
function broadcastDelta() {
    sendRoom({
        type: 'delta',
        targetScore: targetScore.value,
        // players: [{ id: myId, name: myName.value }],
    })
}
function broadcastScoreDelta() {
    sendRoom({ type: 'score', scores: { [myId]: scores[myId] || 0 } })
}
function broadcastLeave() {
    sendRoom({ type: 'leave', players: [{ id: myId }] })
}

function idxById(id) {
    return players.findIndex((p) => p.id === id)
}
function mergePlayers(incoming) {
    let changed = false
    for (const p of incoming) {
        if (!p || !p.id) continue
        const i = idxById(p.id)
        if (i >= 0) {
            const cur = players[i]
            if (cur.name !== p.name) {
                cur.name = p.name
                changed = true
            }
        } else {
            players.push({ id: p.id, name: p.name })
            changed = true
        }
    }
    return changed
}
function mergeScores(inScores) {
    let changed = false
    for (const [pid, val] of Object.entries(inScores)) {
        const n = Number(val)
        if (!Number.isFinite(n)) continue
        if (scores[pid] !== n) {
            scores[pid] = n
            changed = true
        }
    }
    return changed
}
function removePlayerById(id) {
    const i = idxById(id)
    if (i >= 0) players.splice(i, 1)
    if (scores[id] != null) delete scores[id]
}

function confirm() {
    myName.value = tempName.value
    showModal.value = false
    if (idxById(myId) < 0) players.push({ id: myId, name: myName.value })
    if (scores[myId] == null) scores[myId] = 0
    broadcastHello()
}

function openTargetDialog() {
    const raw = window.prompt(
        'Nhập target score',
        String(targetScore.value || 0),
    )
    if (raw == null) return
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) return
    targetScore.value = Math.floor(n)
    broadcastDelta()
}

onMounted(() => {
    connectWS()
    window.addEventListener('beforeunload', broadcastLeave)
})
onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', broadcastLeave)
    broadcastLeave()
})

// logic game
const usedWords = new Set()

async function isValidWord(word) {
    try {
        const res = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
        )
        if (!res.ok) return false
        const data = await res.json()
        return Array.isArray(data) && data.length > 0
    } catch {
        return false
    }
}

async function sendWord() {
    const newWord = text.value.trim().toLowerCase()

    // Kiểm tra trống
    if (!newWord) {
        messageError.value = 'Nội dung trống'
        setTimeout(() => (messageError.value = ''), 800)
        return
    }

    // Kiểm tra độ dài
    if (newWord.length < 2) {
        messageError.value = 'Từ phải có ít nhất 2 ký tự'
        setTimeout(() => (messageError.value = ''), 1500)
        return
    }

    // Lấy từ cuối cùng trước đó
    if (messages.length > 0) {
        const lastMsg = [...messages].reverse().find((m) => m.from) // lấy message user thật
        if (lastMsg) {
            const lastWord = lastMsg.text.trim().toLowerCase()
            if (newWord[0] !== lastWord[lastWord.length - 1]) {
                messageError.value = `Từ phải bắt đầu bằng "${lastWord[lastWord.length - 1]}"`
                setTimeout(() => (messageError.value = ''), 1500)
                return
            }
        }
    }

    // Kiểm tra từ đã dùng chưa
    if (usedWords.has(newWord)) {
        messageError.value = 'Từ này đã được sử dụng trước đó'
        setTimeout(() => (messageError.value = ''), 1500)
        return
    }

    // Kiểm tra nghĩa từ qua API
    const valid = await isValidWord(newWord)
    if (!valid) {
        messageError.value = 'Từ này không tồn tại trong từ điển'
        setTimeout(() => (messageError.value = ''), 1500)
        return
    }

    // Nếu qua hết kiểm tra
    usedWords.add(newWord)
    sendWSMessage(newWord)

    // Cộng điểm theo số chữ cái
    const wordPoints = newWord.length
    scores[myId] = (scores[myId] || 0) + wordPoints
    broadcastScoreDelta()

    // Kiểm tra thắng
    checkWinner()

    // Clear input
    text.value = ''
}

// Hàm kiểm tra thắng
function checkWinner() {
    if (resetting.value) return
    const ts = Number(targetScore.value || 0)
    if (ts <= 0) return

    for (const [pid, sc] of Object.entries(scores)) {
        const scoreNum = Number(sc)
        if (scoreNum >= ts) {
            const wp = players.find((p) => p.id === pid)
            if (!wp) break

            resetting.value = true

            // hiển thị cục bộ
            showWinner.value = true
            winner.value = { id: pid, name: wp.name, score: scoreNum }

            // dọn state local
            clearSuggestions() // <<< xóa popup gợi ý
            usedWords.clear() // <<< xóa lịch sử từ
            messages.splice(0, messages.length)
            targetScore.value = 0

            // broadcast reset kèm winner cho TẤT CẢ client
            sendRoom({
                type: 'reset',
                targetScore: 0,
                messages: [],
                winner: { id: pid, name: wp.name, score: scoreNum },
            })

            // reset điểm + broadcast
            Object.keys(scores).forEach((k) => (scores[k] = 0))
            broadcastScoreDelta()

            // nhả cờ chống đúp
            setTimeout(() => {
                resetting.value = false
            }, 0)
            break
        }
    }
}

// --- GỢI Ý ---------------
const suggestOn = ref(false)
const suggestions = ref([]) // [{word: '...'}]
const suggesting = ref(false)
let sugTimer = null
let sugAbort = null

function clearSuggestions() {
    suggestions.value = []
    suggesting.value = false
    if (sugTimer) {
        clearTimeout(sugTimer)
        sugTimer = null
    }
    if (sugAbort) {
        try {
            sugAbort.abort()
        } catch {}
        sugAbort = null
    }
}

async function fetchSuggestions(q) {
    if (sugAbort) {
        try {
            sugAbort.abort()
        } catch {}
    }
    suggesting.value = true
    try {
        // NEW: an toàn với môi trường không có AbortController
        if (typeof AbortController !== 'undefined') {
            sugAbort = new AbortController()
        } else {
            sugAbort = null
        }
        const opts = sugAbort ? { signal: sugAbort.signal } : {}

        const r = await fetch(
            `https://api.datamuse.com/sug?s=${encodeURIComponent(q)}&max=5`,
            opts,
        )
        if (!r.ok) throw new Error('net')
        const data = await r.json()
        suggestions.value = (Array.isArray(data) ? data : []).slice(0, 5)
    } catch {
        suggestions.value = []
    } finally {
        suggesting.value = false
        sugAbort = null
    }
}

// debounce khi gõ
watch(text, (v) => {
    if (!suggestOn.value) {
        clearSuggestions()
        return
    }
    const q = (v || '').trim().toLowerCase()
    if (q.length < 3) {
        clearSuggestions()
        return
    }
    if (sugTimer) clearTimeout(sugTimer)
    sugTimer = setTimeout(() => fetchSuggestions(q), 200)
})

// tắt switch => xóa gợi ý
watch(suggestOn, (on) => {
    if (!on) clearSuggestions()
})

function pickSuggestion(w) {
    text.value = w
    clearSuggestions()
    // đặt focus lại input nếu cần:
    // document.querySelector('#composer-input')?.focus()
}
function startFireworks(ms = 3000) {
    const end = Date.now() + ms
    ;(function frame() {
        window.confetti({
            particleCount: 6,
            angle: 60,
            spread: 60,
            origin: { x: 0 },
        })
        window.confetti({
            particleCount: 6,
            angle: 120,
            spread: 60,
            origin: { x: 1 },
        })
        if (Date.now() < end) requestAnimationFrame(frame)
    })()
}
function closeWinner() {
    showWinner.value = false
}

watch(showWinner, (v) => {
    if (v && winner.value) startFireworks(3000)
})
</script>

<style>
.app-shell {
    max-width: 1100px;
    margin: auto;
}
.chip {
    padding: 4px 8px;
    border-radius: 999px;
    background: #f1f3f5;
}
.chip-success {
    background: #e6fcf5;
    color: #0ca678;
}
</style>
