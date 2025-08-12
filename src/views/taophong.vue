<template>
    <div
        class="d-flex flex-column align-items-center justify-content-center vh-100 bg-light"
    >
        <h1 class="mb-4 fw-bold text-primary">Game PIN</h1>

        <!-- Ô nhập PIN -->
        <input
            v-model="pin"
            class="form-control w-auto mb-3 text-center"
            placeholder="Nhập PIN (vd: 123)"
            @keyup.enter="joinRoom"
        />

        <!-- Nút điều khiển -->
        <div class="d-flex gap-3">
            <button class="btn btn-success" @click="joinRoom">Join</button>
            <button class="btn btn-warning" @click="createRoom">
                Tạo phòng
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/utils/firebase'
import { doc, setDoc } from 'firebase/firestore'

const router = useRouter()
const pin = ref('')

// Hàm tạo PIN ngẫu nhiên, mặc định 3 chữ số
function generatePin(length = 3) {
    const min = Math.pow(10, length - 1)
    const max = Math.pow(10, length) - 1
    return Math.floor(Math.random() * (max - min + 1)) + min
}

// Vào phòng đã có sẵn
const joinRoom = () => {
    const value = pin.value.trim()
    if (!/^\d+$/.test(value)) {
        alert('PIN phải là số')
        return
    }
    router.push(`/chat/${value}`)
}

// Tạo phòng mới
const createRoom = async () => {
    const roomId = generatePin(3).toString()
    // Tạo document rỗng trong Firestore để phòng tồn tại
    await setDoc(doc(db, 'rooms', roomId), {
        createdAt: Date.now(),
        gameStarted: false,
        targetScore: null,
        hostId: null,
    })

    router.push(`/chat/${roomId}?host=1`)
}
</script>
