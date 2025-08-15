<template>
    <!-- <div
        style="
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.5);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            z-index: 9999;
        "
    >
        <span class="ms-2">WS:</span>
        <span class="badge" :class="readyBadge">{{ ready }}</span>
    </div> -->

    <div class="container-fluid h-100dvh app-shell">
        <!-- Header -->
        <div class="chat-header border-bottom">
            <div
                class="d-flex align-items-center justify-content-between gap-2 w-100"
            >
                <div class="d-flex align-items-center gap-2">
                    <button
                        class="btn btn-outline-secondary btn-sm d-inline-flex d-md-none"
                        type="button"
                        data-bs-toggle="offcanvas"
                        data-bs-target="#playersOffcanvas"
                        aria-controls="playersOffcanvas"
                    >
                        👥 Người chơi
                    </button>
                    <span class="hide-on-mobile">
                        <span class="fw-semibold">PIN phòng:</span>
                        <span class="badge bg-dark text-white">
                            {{ roomId }}
                        </span>
                    </span>
                </div>

                <!-- Center: target -->
                <div class="flex-grow-1 d-flex justify-content-center">
                    <span
                        class="badge bg-primary text-white rounded-pill px-3 py-2"
                        style="
                            font-size: 1rem;
                            cursor: pointer;
                            user-select: none;
                        "
                        @click="openTargetDialog"
                        title="Đặt target score"
                    >
                        🎯 Target: {{ targetScore }}
                    </span>
                </div>

                <!-- Right: suggest -->
                <div class="d-flex align-items-center gap-2 ms-auto">
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
            </div>

            <div v-if="showWinner && winner" class="modal d-block text-center">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content p-4 rounded-4 shadow-lg">
                        <h3 class="mb-3">🏁 Người chiến thắng!</h3>
                        <h4>
                            <span class="neon-name">{{ winner.name }}</span>
                            ({{ winner.score }} điểm)
                        </h4>
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
        </div>

        <div class="row g-0 main-row" style="height: 100%">
            <!-- Sidebar desktop -->
            <aside
                class="col-md-4 d-none d-md-flex flex-column border-end players-panel"
                style="height: 100%"
            >
                <!-- Header -->
                <div
                    class="p-2 border-bottom d-flex align-items-center justify-content-between"
                >
                    <div class="d-flex align-items-center gap-2 ms-auto">
                        <span class="fw-semibold">Số người:</span>
                        <span class="badge bg-primary text-white">
                            {{ players.length }}
                        </span>
                    </div>
                </div>

                <!-- Danh sách -->
                <div
                    class="list-wrap p-2 overflow-auto"
                    style="height: calc(100vh - 48px)"
                >
                    <div>
                        <div
                            v-for="p in sortedPlayers"
                            :key="p.id"
                            class="card shadow-sm player-card"
                        >
                            <div
                                class="mb-2 card-body d-flex justify-content-between align-items-center"
                            >
                                <span
                                    :class="
                                        p.id === myId
                                            ? 'neon-name'
                                            : 'neon-name-orange'
                                    "
                                >
                                    {{ p.name }}
                                </span>
                                <span
                                    class="badge rounded-pill px-3 py-2"
                                    :class="
                                        scoreOf(p.id) === maxScore
                                            ? 'bg-warning text-dark'
                                            : 'bg-secondary-subtle text-secondary-emphasis'
                                    "
                                >
                                    <span v-if="scoreOf(p.id) === maxScore">
                                        🏆
                                    </span>
                                    {{ scoreOf(p.id) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <!-- Offcanvas mobile -->
            <div
                class="offcanvas offcanvas-start d-md-none"
                tabindex="-1"
                id="playersOffcanvas"
                aria-labelledby="playersOffcanvasLabel"
            >
                <div class="offcanvas-header">
                    <h5 id="playersOffcanvasLabel" class="offcanvas-title">
                        Người chơi
                    </h5>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    ></button>
                </div>
                <div class="offcanvas-body p-0 d-flex flex-column">
                    <div
                        class="p-2 border-top border-bottom d-flex align-items-center justify-content-between"
                    >
                        <span class="text-muted small">
                            {{ players.length }} người
                        </span>
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
                                <span
                                    :class="
                                        p.id === myId
                                            ? 'neon-name'
                                            : 'neon-name-orange'
                                    "
                                >
                                    {{ p.name }}
                                </span>
                                <span
                                    class="badge rounded-pill px-3 py-2"
                                    :class="
                                        scoreOf(p.id) === maxScore
                                            ? 'bg-warning text-dark'
                                            : 'bg-secondary-subtle text-secondary-emphasis'
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
            </div>

            <!-- Khung chat -->
            <section
                class="col-12 col-md-8 chat-panel d-flex flex-column p-0"
                style="height: 100%"
            >
                <!-- Điểm cá nhân -->
                <div
                    class="d-flex align-items-center gap-2 p-2 border-bottom bg-body-tertiary chat-subheader"
                >
                    <span class="chip">
                        💎 Điểm của
                        <span class="neon-name">{{ myName }}</span>
                        : {{ scores[myId] || 0 }}
                    </span>
                </div>

                <!-- Nội dung tin nhắn: vùng cuộn-->
                <div
                    class="p-3 chat-scroll flex-grow-1 chat-scroll-reverse"
                    id="chat-scroll"
                >
                    <div class="scroll-anchor" aria-hidden="true"></div>
                    <div
                        v-for="(m, i) in [...messages].reverse()"
                        :key="i"
                        class="msg-row"
                        :class="m.from === myName ? 'me' : 'other'"
                    >
                        <div class="msg-bubble">
                            <div class="msg-text">{{ m.text }}</div>
                        </div>
                        <div
                            class="msg-meta"
                            :class="m.from === myName ? 'text-end' : ''"
                        >
                            <span
                                class="name"
                                :class="
                                    m.from === myName
                                        ? 'neon-name'
                                        : 'neon-name-orange'
                                "
                            >
                                {{ m.from }}
                            </span>
                            <span style="color: red" v-if="isTopSender(m.from)">
                                🏆{{ maxScore }}🏆
                            </span>
                            <span style="color: chartreuse">
                                &nbsp;+{{ m.text.length }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Composer cố định đáy panel -->
                <div class="composer border-top shadow-top" v-if="!showWinner">
                    <div class="position-relative">
                        <!-- Gợi ý nổi -->
                        <div
                            v-if="
                                suggestOn && (suggesting || suggestions.length)
                            "
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

                        <!-- Input + Gửi -->
                        <div v-if="targetScore === 0" class="error-float">
                            Vui lòng nhập target score trước khi chơi.
                        </div>
                        <div v-if="messageError" class="error-float">
                            {{ messageError }}
                        </div>
                        <div class="input-group position-relative">
                            <input
                                id="composer-input"
                                v-model="text"
                                type="text"
                                class="form-control form-control-lg chat-input"
                                placeholder="Nhập tin..."
                                @keyup.enter="sendWord"
                                autocomplete="off"
                                :disabled="targetScore === 0"
                            />
                            <button
                                class="btn btn-primary btn-lg"
                                type="button"
                                @click="sendWord"
                                :disabled="targetScore === 0"
                            >
                                Gửi
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <!-- Modal nhập tên -->
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
          : 'http://localhost:8080/ws'

    const sock = new SockJS(WS_BASE)
    stompClient = Stomp.over(sock)
    stompClient.debug = null
    stompClient.connect(
        {},
        () => {
            ready.value = 'connected'

            stompClient.subscribe(`/topic/room.${roomId.value}`, (frame) => {
                const msg = JSON.parse(frame.body)
                messages.push({ from: msg.senderId, text: msg.content })
                usedWords.add(msg.content.trim().toLowerCase())
            })

            stompClient.subscribe(
                `/topic/room-info.${roomId.value}`,
                (frame) => {
                    const info = safeParse(frame.body)
                    if (!info) return
                    // xử lý lỗi từ server (từ trùng)
                    if (info.type === 'error' && info.origin === myId) {
                        messageError.value = info.msg
                        setTimeout(() => (messageError.value = ''), 1500)
                        return
                    }
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

            stompClient.subscribe(
                `/topic/room-history.${roomId.value}`,
                (frame) => {
                    const list = JSON.parse(frame.body)
                    messages.splice(
                        0,
                        messages.length,
                        ...list.map((m) => ({
                            from: m.senderId,
                            text: m.content,
                        })),
                    )
                    list.forEach((m) => {
                        if (m && m.content) {
                            usedWords.add(m.content.trim().toLowerCase())
                        }
                    })
                },
            )
            stompClient.subscribe('/user/queue/errors', (frame) => {
                messageError.value = frame.body
                setTimeout(() => (messageError.value = ''), 1500)
            })

            // sau khi kết nối thành công
            stompClient.send(
                '/app/chat.history',
                {},
                JSON.stringify({ roomId: roomId.value }),
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
    })
}
function broadcastDelta() {
    sendRoom({
        type: 'delta',
        targetScore: targetScore.value,
        players: [{ id: myId, name: myName.value }],
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

// logic game
const usedWords = new Set()

async function isValidWord(word) {
    const newWord = word.trim().toLowerCase()

    // Kiểm tra trống
    if (!newWord) {
        messageError.value = 'Nội dung trống'
        return false
    }
    // Kiểm tra chỉ gồm chữ cái
    if (!/^[a-zA-Z]+$/.test(newWord)) {
        messageError.value = 'Từ chỉ được chứa chữ cái (a-z)'
        return false
    }
    // Kiểm tra độ dài
    if (newWord.length < 2) {
        messageError.value = 'Từ phải có ít nhất 2 ký tự'
        return false
    }

    // Lấy từ cuối cùng trước đó (tin nhắn người dùng thật)
    if (messages.length > 0) {
        const lastMsg = [...messages].reverse().find((m) => m.from)
        if (lastMsg) {
            const lastWord = lastMsg.text.trim().toLowerCase()
            if (newWord[0] !== lastWord[lastWord.length - 1]) {
                messageError.value = `Từ phải bắt đầu bằng "${lastWord[lastWord.length - 1]}"`
                return false
            }
        }
    }

    // Kiểm tra từ đã dùng chưa
    if (usedWords.has(newWord)) {
        messageError.value = 'Từ này đã được sử dụng trước đó'
        return false
    }

    // Kiểm tra nghĩa từ qua API
    try {
        const res = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${newWord}`,
        )
        if (!res.ok) {
            messageError.value = 'Từ này không tồn tại trong từ điển'
            return false
        }
        const data = await res.json()
        if (!Array.isArray(data) || data.length === 0) {
            messageError.value = 'Từ này không tồn tại trong từ điển'
            return false
        }
    } catch {
        messageError.value = 'Không thể kiểm tra từ'
        return false
    }

    return true
}
async function sendWord() {
    if (targetScore.value === 0) {
        messageError.value = 'Vui lòng nhập target score trước khi chơi.'
        setTimeout(() => (messageError.value = ''), 1500)
        return
    }
    const newWord = text.value.trim().toLowerCase()

    const valid = await isValidWord(newWord)
    if (!valid) {
        setTimeout(() => (messageError.value = ''), 1500)
        return
    }
    usedWords.add(newWord)
    sendWSMessage(newWord)

    const wordPoints = newWord.length
    scores[myId] = (scores[myId] || 0) + wordPoints
    broadcastScoreDelta()

    checkWinner()
    text.value = ''
}

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
            clearSuggestions()
            usedWords.clear()
            messages.splice(0, messages.length)
            targetScore.value = 0

            Object.keys(scores).forEach((k) => (scores[k] = 0))
            sendRoom({
                type: 'reset',
                targetScore: 0,
                messages: [],
                winner: { id: pid, name: wp.name, score: scoreNum },
            })

            // reset điểm + broadcast
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

const isTopSender = (name) => {
    const player = players.find((p) => p.name === name)
    return player && scoreOf(player.id) === maxScore.value
}

const sortedPlayers = computed(() => {
    return [...players].sort((a, b) => scoreOf(b.id) - scoreOf(a.id))
})

import { nextTick } from 'vue'

watch(messages, async () => {
    await nextTick()
    const el = document.getElementById('chat-scroll')
    if (el) {
        el.scrollTop = el.scrollHeight
    }
})

// thêm biến và hàm mới
let exitHandled = false

function isAlone() {
    return players.filter((p) => p && p.id).length === 1 && idxById(myId) >= 0
}
function resetRoomNow() {
    sendRoom({ type: 'reset', targetScore: 0, messages: [], winner: null })
}
function handleExitOnce() {
    if (exitHandled) return
    exitHandled = true
    if (stompClient && stompClient.connected) {
        if (isAlone()) resetRoomNow()
        broadcastLeave()
    }
}
function handleExitEvent() {
    handleExitOnce()
}

onMounted(() => {
    connectWS()
    window.addEventListener('pagehide', handleExitEvent)
    window.addEventListener('beforeunload', broadcastLeave)
})
</script>

<style src="./style.css"></style>
