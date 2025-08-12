import { ref, computed, onBeforeUnmount } from 'vue'
import { createRoom, joinRoom, sendMessage, getReadyState, closeAll } from '@/utils/webrtc'

export function useChat(roomId, isHost, myName, myId, onReceiveWord) {
  const messages = ref([])
  const text = ref('')
  const ready = ref('closed')
  let timer = null

  const onMessage = (raw) => {
    try {
      const msg = JSON.parse(raw)
      messages.value.push({ from: msg.from, text: msg.text })
      if (onReceiveWord) onReceiveWord(msg.text, msg.fromId)
    } catch {
      messages.value.push({ from: 'peer', text: raw })
    }
  }

  const tickReady = () => {
    ready.value = getReadyState()
  }

  // const initChat = async () => {
  //   if (ready.value === 'open') return
  //   if (isHost.value) {
  //     await createRoom(roomId.value, onMessage, myName.value, myId)
  //   } else {
  //     await joinRoom(roomId.value, onMessage, myName.value, myId)
  //   }
  //   timer = setInterval(tickReady, 300)
  // }

  const send = (textToSend) => {
    sendMessage(textToSend, myId)
    // Chỉ host mới cần push tin nhắn của mình ngay lập tức,
    // peer sẽ nhận lại tin của mình từ host qua DataChannel
    if (isHost.value) {
      messages.value.push({ from: myName.value, text: textToSend })
    }
  }

  // onBeforeUnmount(() => {
  //   closeAll()
  //   if (timer) clearInterval(timer)
  // })
// Trong useChat.js
const initChat = async () => {
+   console.log('[DEBUG] initChat() called, ready=', ready.value)
    if (ready.value === 'open') {
+       console.log('[DEBUG] initChat aborted: already open')
        return
    }
    if (isHost.value) {
+       console.log('[DEBUG] createRoom() for host')
        await createRoom(roomId.value, onMessage, myName.value, myId)
    } else {
+       console.log('[DEBUG] joinRoom() for peer')
        await joinRoom(roomId.value, onMessage, myName.value, myId)
    }
    timer = setInterval(tickReady, 300)
}

onBeforeUnmount(() => {
+   console.log('[DEBUG] onBeforeUnmount -> closeAll()')
    closeAll()
    if (timer) clearInterval(timer)
})

  const readyBadge = computed(() =>
    ready.value === 'open'
      ? 'bg-success'
      : ready.value === 'closing'
      ? 'bg-warning'
      : 'bg-secondary'
  )

  return { messages, text, ready, readyBadge, send, initChat }
}
