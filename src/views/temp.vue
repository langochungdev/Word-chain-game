<template>
    <div class="container-fluid vh-100 d-flex flex-column">
        <!-- Header: chỉ hiện leader khi đang chơi -->
        <div v-if="leader" class="bg-warning text-dark p-2 text-center fw-bold">
            🏆 Leader:
            {{ players.find((p) => p.id === leader[0])?.name || leader[0] }}
            ({{ leader[1] }} điểm) | 🎯 Mục tiêu: {{ targetScore }} | 💎 Điểm
            của bạn: {{ scores[myId] || 0 }}
        </div>

        <!-- UI phòng chờ -->
        <template v-if="!gameStarted">
            <!-- Banner thắng: chỉ phòng chờ -->
            <div
                v-if="showWinner && winner"
                class="bg-success text-white p-2 text-center fw-bold"
            >
                🏁 Người thắng: {{ winner.name }} ({{ winner.score }} điểm)
            </div>
            <div
                class="d-flex justify-content-between align-items-center p-2 bg-light border-bottom"
            >
                <div class="d-flex align-items-center gap-2">
                    <span class="fw-semibold">PIN phòng:</span>
                    <span class="badge bg-dark">
                        {{ roomId }} | 🎯 {{ targetScore ?? 'Chưa đặt' }}
                    </span>
                </div>
                <div>
                    <span class="fw-semibold">Số người:</span>
                    <span class="badge bg-primary">{{ players.length }}</span>
                </div>
            </div>

            <div class="flex-grow-1 p-3">
                <h5 class="mb-3">Phòng chờ</h5>
                <ul class="list-group">
                    <li
                        v-for="(p, i) in players"
                        :key="i"
                        class="list-group-item d-flex justify-content-between"
                    >
                        <span>{{ p.name }}</span>
                        <span
                            :class="[
                                'badge',
                                p.ready ? 'bg-success' : 'bg-secondary',
                            ]"
                        >
                            {{ p.ready ? 'Sẵn sàng' : 'Đang chờ' }}
                        </span>
                    </li>
                </ul>
            </div>

            <div class="border-top p-2 d-flex justify-content-end gap-2">
                <button
                    v-if="isHost"
                    class="btn btn-primary"
                    :disabled="!myName || !targetScore"
                    @click="startGame"
                >
                    Bắt đầu
                </button>
                <button
                    v-else
                    class="btn btn-success"
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
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Nhập tên</h5>
                                <h5 v-if="isHost" class="modal-title ms-3">
                                    Nhập điểm mục tiêu
                                </h5>
                            </div>
                            <div class="modal-body">
                                <input
                                    class="form-control mb-2"
                                    v-model.trim="myName"
                                    placeholder="Tên hiển thị"
                                />
                                <input
                                    v-if="isHost"
                                    type="number"
                                    class="form-control"
                                    v-model.number="targetScore"
                                    placeholder="Điểm mục tiêu"
                                />
                            </div>
                            <div class="modal-footer">
                                <button
                                    class="btn btn-primary"
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

        <!-- UI phòng chat -->
        <template v-else>
            <div
                class="d-flex justify-content-between align-items-center p-2 bg-light border-bottom"
            >
                <div>
                    Room:
                    <span class="badge bg-dark">{{ roomId }}</span>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="form-check-label">Gợi ý từ</label>
                    <div class="form-check form-switch m-0">
                        <input
                            class="form-check-input"
                            type="checkbox"
                            v-model="suggestMode"
                        />
                    </div>
                    <div>
                        DataChannel:
                        <span class="badge" :class="readyBadge">
                            {{ ready }}
                        </span>
                    </div>
                </div>
            </div>

            <div class="flex-grow-1 overflow-auto p-3">
                <div
                    v-for="(m, i) in messages"
                    :key="i"
                    class="mb-2"
                    :class="m.from === myName ? 'text-end' : ''"
                >
                    <strong>{{ m.from }}:</strong>
                    {{ m.text }}
                </div>
            </div>

            <div class="p-2 border-top position-relative">
                <div class="input-group position-relative">
                    <input
                        v-model="text"
                        type="text"
                        class="form-control"
                        placeholder="Nhập từ..."
                        @input="onInputText(text)"
                        @keyup.enter="sendWord"
                    />
                    <button
                        class="btn btn-primary"
                        type="button"
                        @click="sendWord"
                    >
                        Gửi
                    </button>

                    <!-- Danh sách gợi ý -->
                    <ul
                        v-if="suggestions.length"
                        class="list-group position-absolute w-100"
                        style="
                            bottom: 100%;
                            left: 0;
                            z-index: 1000;
                            max-height: 150px;
                            overflow-y: auto;
                        "
                    >
                        <li
                            v-for="(s, i) in suggestions"
                            :key="i"
                            class="list-group-item list-group-item-action"
                        >
                            {{ s }}
                        </li>
                    </ul>
                </div>
                <div v-if="messageError" class="text-danger mt-1">
                    {{ messageError }}
                </div>
            </div>
        </template>
    </div>
</template>

<!-- import { ref } from 'vue' export function useSuggestions() { const suggestMode =
ref(false) const suggestions = ref([]) const fetchSuggestions = async (query) =>
{ if (!suggestMode.value || query.length < 3) { suggestions.value = [] return }
try { const res = await
fetch(`https://api.datamuse.com/words?sp=${query}*&max=20`) const data = await
res.json() const sorted = data .map((item) => item.word) .sort((a, b) =>
a.length - b.length) .slice(0, 3) suggestions.value = sorted } catch (e) {
console.error(e) suggestions.value = [] } } const onInputText = (text) => {
fetchSuggestions(text.trim().toLowerCase()) } const applySuggestion = (word,
textRef) => { textRef.value = word suggestions.value = [] } return {
suggestMode, suggestions, onInputText, applySuggestion } } -->
