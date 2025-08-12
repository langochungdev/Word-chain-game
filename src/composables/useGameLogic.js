import { ref } from 'vue'
import { db } from '@/utils/firebase'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { sendMessage } from '@/utils/webrtc'

export function useGameLogic(roomId, myId, myName, isHost, targetScore, gameStarted) {
  const scores = ref({})
  const leader = ref(null)
  const lastWord = ref('')
  const messageError = ref('')

  // Kiểm tra từ hợp lệ qua API Datamuse
  const checkValidWord = async (word) => {
    try {
      const res = await fetch(`https://api.datamuse.com/words?sp=${word}&max=1`)
      const data = await res.json()
      return data.length > 0
    } catch (e) {
      return false
    }
  }

  // Xử lý gửi tin nhắn kèm luật chơi
  const trySendWord = async (word, players, messages) => {
    messageError.value = ''

    // 1. Nếu chưa ai nhắn và mình không phải host → chặn
    if (!messages.value.length && !isHost.value) {
      messageError.value = 'Chỉ chủ phòng được gửi tin nhắn đầu tiên!'
      return false
    }

    // 2. Nếu có lastWord → phải nối chữ
    if (lastWord.value) {
      const lastChar = lastWord.value.slice(-1).toLowerCase()
      const firstChar = word[0].toLowerCase()
      if (lastChar !== firstChar) {
        messageError.value = `Từ phải bắt đầu bằng "${lastChar.toUpperCase()}"`
        return false
      }
    }

    // 3. Kiểm tra chính tả
    const isValid = await checkValidWord(word.toLowerCase())
    if (!isValid) {
      messageError.value = 'Từ không hợp lệ hoặc sai chính tả!'
      return false
    }

    // 4. Gửi tin thành công qua WebRTC
    sendMessage(word)
    messages.value.push({ from: myName.value, text: word })

    // 5. Cập nhật lastWord
    lastWord.value = word

    // 6. Cộng điểm cho người chơi
    const points = word.length
    scores.value[myId] = (scores.value[myId] || 0) + points

    // 7. Cập nhật Firestore điểm
    await updateDoc(doc(db, 'rooms', roomId.value, 'players', myId), {
      score: scores.value[myId]
    })

    // 8. Tìm người dẫn đầu
    leader.value = Object.entries(scores.value).sort((a, b) => b[1] - a[1])[0] || null

    // 9. Kiểm tra thắng
    if (scores.value[myId] >= targetScore.value) {
      alert(`${myName.value} đã chiến thắng!`)
      gameStarted.value = false // về phòng chờ
    }

    return true
  }

  // Khi nhận tin nhắn từ người khác
  const onReceiveWord = (word, fromId) => {
    lastWord.value = word
    scores.value[fromId] = (scores.value[fromId] || 0) + word.length
    leader.value = Object.entries(scores.value).sort((a, b) => b[1] - a[1])[0] || null
  }

  return { trySendWord, onReceiveWord, scores, leader, messageError }
}
