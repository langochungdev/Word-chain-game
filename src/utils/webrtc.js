import { doc, setDoc, onSnapshot, collection, addDoc } from 'firebase/firestore'
import { db } from './firebase'

const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }]

let isHost = false
let myId = null
let myName = ''
let peers = {}
let onMsgCb = null

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
    const pc = new RTCPeerConnection({ iceServers })
    const dc = pc.createDataChannel('chat')

    dc.onmessage = (e) => {
        onMsgCb(e.data)
        Object.entries(peers).forEach(([id, p]) => {
            if (id !== peerId && p.dc?.readyState === 'open') {
                p.dc.send(e.data)
            }
        })
    }

    pc.onicecandidate = async (e) => {
        if (e.candidate) {
            await addDoc(
                collection(
                    db,
                    'rooms',
                    roomId,
                    'peers',
                    peerId,
                    'hostCandidates',
                ),
                e.candidate.toJSON(),
            )
        }
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    await setDoc(
        doc(db, 'rooms', roomId, 'peers', peerId),
        { offer: { type: offer.type, sdp: offer.sdp } },
        { merge: true },
    )

    const unsubAnswers = onSnapshot(
        doc(db, 'rooms', roomId, 'peers', peerId),
        (snap) => {
            const data = snap.data()
            if (data?.answer && !pc.currentRemoteDescription) {
                pc.setRemoteDescription(new RTCSessionDescription(data.answer))
            }
        },
    )

    const unsubICE = onSnapshot(
        collection(db, 'rooms', roomId, 'peers', peerId, 'peerCandidates'),
        (snap) => {
            snap.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const cand = new RTCIceCandidate(change.doc.data())
                    pc.addIceCandidate(cand)
                }
            })
        },
    )

    peers[peerId] = { pc, dc, unsubAnswers, unsubICE }
}

export async function joinRoom(roomId, onMessage, name, id) {
    isHost = false
    myId = id
    myName = name
    onMsgCb = (raw) => onMessage(raw)

    const pc = new RTCPeerConnection({ iceServers })
    let dc = null

    pc.ondatachannel = (e) => {
        dc = e.channel
        dc.onmessage = (ev) => onMsgCb(ev.data)
        peers['host'] = { pc, dc }
    }

    pc.onicecandidate = async (e) => {
        if (e.candidate) {
            await addDoc(
                collection(
                    db,
                    'rooms',
                    roomId,
                    'peers',
                    myId,
                    'peerCandidates',
                ),
                e.candidate.toJSON(),
            )
        }
    }

    await setDoc(doc(db, 'rooms', roomId, 'peers', myId), {
        role: 'peer',
        name: myName,
    })

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
        }
    })

    onSnapshot(
        collection(db, 'rooms', roomId, 'peers', myId, 'hostCandidates'),
        (snap) => {
            snap.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const cand = new RTCIceCandidate(change.doc.data())
                    pc.addIceCandidate(cand)
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
