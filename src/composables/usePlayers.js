// composables/usePlayers.js
import { ref, onMounted } from 'vue'
import { db } from '@/utils/firebase'
import { doc, setDoc, updateDoc, onSnapshot, collection } from 'firebase/firestore'
import { getReadyState } from '@/utils/webrtc'
export function usePlayers(roomId, isHost, myId, myName, targetScore, initChat, showModal) {
  const players = ref([])
  const gameStarted = ref(false)

  // refs cố định
  const roomRef = doc(db, 'rooms', roomId.value)
  const playersRef = collection(roomRef, 'players')

  // const confirm = async () => {
  //   showModal.value = false
  //   await setDoc(doc(playersRef, myId), { name: myName.value, ready: false, score: 0 })
  //   if (isHost.value) {
  //     await setDoc(
  //       roomRef,
  //       { targetScore: targetScore.value, gameStarted: false, hostId: myId },
  //       { merge: true }
  //     )
  //   }
  //   initChat()
  // }
// Trong usePlayers.js
const confirm = async () => {
+   console.log('[DEBUG] confirm() called, myId=', myId)
    showModal.value = false
    await setDoc(doc(playersRef, myId), { name: myName.value, ready: false, score: 0 })
    if (isHost.value) {
+       console.log('[DEBUG] Host set targetScore/gameStarted=false')
        await setDoc(
            roomRef,
            { targetScore: targetScore.value, gameStarted: false, hostId: myId },
            { merge: true }
        )
    }
+   console.log('[DEBUG] Calling initChat() from confirm()')
    initChat()
}

const startGame = async () => {
    if (!isHost.value) return
+   console.log('[DEBUG] startGame() called by host')
    await updateDoc(roomRef, { gameStarted: true })
}


  const readyUp = async () => {
    await updateDoc(doc(playersRef, myId), { ready: true })
  }

  onMounted(() => {
    onSnapshot(playersRef, snap => {
      players.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    })

    onSnapshot(roomRef, snap => {
      const data = snap.data()
      if (data) gameStarted.value = data.gameStarted
    })
  })

  return { players, gameStarted, confirm, startGame, readyUp }
}
