import { doc, setDoc, onSnapshot, collection, addDoc } from 'firebase/firestore'
import { db } from './firebase'

// Thay bằng TURN của bạn (coturn hay nhà cung cấp)
// Không dùng demo username/password trên production.
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
]


let isHost = false
let myId = null
let myName = ''
let peers = {} // peerId -> { pc, dc, unsubAnswers, unsubICE, pendingICE: [] }
let onMsgCb = null

function createPC() {
  const pc = new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
  })
  pc.onconnectionstatechange = () =>
    console.log('[RTC] connectionState =', pc.connectionState)
  pc.oniceconnectionstatechange = () =>
    console.log('[RTC] iceConnectionState =', pc.iceConnectionState)
  return pc
}

export function getReadyState() {
  return Object.values(peers).some((p) => p.dc?.readyState === 'open')
    ? 'open'
    : Object.values(peers).some((p) => p.dc)
      ? 'closing'
      : 'closed'
}

export async function createRoom(roomId, onMessage, name, id) {
  isHost = true
  myId = id
  myName = name
  onMsgCb = onMessage

  onSnapshot(collection(db, 'rooms', roomId, 'peers'), (snap) => {
    snap.docChanges().forEach((change) => {
      const peerId = change.doc.id
      if (peerId === myId) return
      if (change.type === 'added' && !peers[peerId]) {
        handleNewPeer(roomId, peerId)
      }
    })
  })

  await setDoc(doc(db, 'rooms', roomId, 'peers', myId), {
    role: 'host',
    name: myName,
  })
}

async function handleNewPeer(roomId, peerId) {
  const pc = createPC()
  const dc = pc.createDataChannel('chat')
  const pendingICE = []

  dc.onopen = () => console.log('[RTC] DC open ->', peerId)
  dc.onclose = () => console.log('[RTC] DC close ->', peerId)

  dc.onmessage = (e) => {
    onMsgCb(e.data)
    // forward cho các peer khác (mesh qua host)
    Object.entries(peers).forEach(([id, p]) => {
      if (id !== peerId && p.dc?.readyState === 'open') {
        p.dc.send(e.data)
      }
    })
  }

  // Gửi ICE của host đến peerId
  pc.onicecandidate = async (e) => {
    if (!e.candidate) return
    await addDoc(
      collection(db, 'rooms', roomId, 'peers', peerId, 'hostCandidates'),
      e.candidate.toJSON(),
    )
  }

  // Tạo offer và publish
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  await setDoc(
    doc(db, 'rooms', roomId, 'peers', peerId),
    { offer: { type: offer.type, sdp: offer.sdp } },
    { merge: true },
  )

  // Nhận answer
  const unsubAnswers = onSnapshot(
    doc(db, 'rooms', roomId, 'peers', peerId),
    async (snap) => {
      const data = snap.data()
      if (data?.answer && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
        // Flush các ICE đến sớm
        while (pendingICE.length) {
          const c = pendingICE.shift()
          try {
            await pc.addIceCandidate(c)
          } catch (err) {
            console.warn('[RTC] addIceCandidate host flush error:', err)
          }
        }
      }
    },
  )

  // Nhận ICE từ peer (đệm nếu remoteDescription chưa set)
  const unsubICE = onSnapshot(
    collection(db, 'rooms', roomId, 'peers', peerId, 'peerCandidates'),
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== 'added') return
        const cand = new RTCIceCandidate(change.doc.data())
        if (!pc.currentRemoteDescription) {
          pendingICE.push(cand)
        } else {
          pc.addIceCandidate(cand).catch((err) =>
            console.warn('[RTC] addIceCandidate host error:', err),
          )
        }
      })
    },
  )

  peers[peerId] = { pc, dc, unsubAnswers, unsubICE, pendingICE }
}

export async function joinRoom(roomId, onMessage, name, id) {
  isHost = false
  myId = id
  myName = name
  onMsgCb = (raw) => onMessage(raw)

  const pc = createPC()
  const pendingICE = []
  let dc = null

  pc.ondatachannel = (e) => {
    dc = e.channel
    dc.onopen = () => console.log('[RTC] DC open -> host')
    dc.onclose = () => console.log('[RTC] DC close -> host')
    dc.onmessage = (ev) => onMsgCb(ev.data)
    peers['host'] = { pc, dc, pendingICE }
  }

  // Gửi ICE của peer đến host
  pc.onicecandidate = async (e) => {
    if (!e.candidate) return
    await addDoc(
      collection(db, 'rooms', roomId, 'peers', myId, 'peerCandidates'),
      e.candidate.toJSON(),
    )
  }

  await setDoc(doc(db, 'rooms', roomId, 'peers', myId), {
    role: 'peer',
    name: myName,
  })

  // Nhận offer và phản hồi answer
  onSnapshot(doc(db, 'rooms', roomId, 'peers', myId), async (snap) => {
    const data = snap.data()
    if (data?.offer && !pc.currentRemoteDescription) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await setDoc(
        doc(db, 'rooms', roomId, 'peers', myId),
        { answer: { type: answer.type, sdp: answer.sdp } },
        { merge: true },
      )
      // Flush ICE đến sớm
      while (pendingICE.length) {
        const c = pendingICE.shift()
        try {
          await pc.addIceCandidate(c)
        } catch (err) {
          console.warn('[RTC] addIceCandidate peer flush error:', err)
        }
      }
    }
  })

  // Nhận ICE từ host (đệm nếu chưa có remoteDescription)
  onSnapshot(
    collection(db, 'rooms', roomId, 'peers', myId, 'hostCandidates'),
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== 'added') return
        const cand = new RTCIceCandidate(change.doc.data())
        if (!pc.currentRemoteDescription) {
          pendingICE.push(cand)
        } else {
          pc.addIceCandidate(cand).catch((err) =>
            console.warn('[RTC] addIceCandidate peer error:', err),
          )
        }
      })
    },
  )
}

export function sendMessage(text, fromId) {
  const payload = JSON.stringify({ from: myName, text, fromId })
  if (isHost) {
    Object.values(peers).forEach(({ dc }) => {
      if (dc?.readyState === 'open') dc.send(payload)
    })
  } else {
    const hostConn = peers['host']
    if (hostConn?.dc?.readyState === 'open') hostConn.dc.send(payload)
  }
}

export function closeAll() {
  Object.values(peers).forEach(({ pc, dc, unsubAnswers, unsubICE }) => {
    try {
      unsubAnswers?.()
    } catch {}
    try {
      unsubICE?.()
    } catch {}
    try {
      dc?.close()
    } catch {}
    try {
      pc?.close()
    } catch {}
  })
  peers = {}
  isHost = false
  myId = null
  myName = ''
  onMsgCb = null
}
