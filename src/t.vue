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
