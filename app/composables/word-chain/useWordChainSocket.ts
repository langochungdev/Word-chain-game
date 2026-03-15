import { ref } from "vue";

function safeParse(jsonText) {
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

export function useWordChainSocket({ roomId, myId, myName }) {
  const ready = ref("disconnected");
  let stompClient = null;

  async function connect(handlers) {
    ready.value = "connecting";

    const prodWs = "https://site--word-chain-backend--lbs5fhkcswml.code.run/ws";
    const wsBase =
      import.meta.dev && window.location.protocol !== "https:"
        ? "http://localhost:8080/ws"
        : prodWs;

    try {
      const [sockjsPkg, stompPkg] = await Promise.all([
        import("sockjs-client/dist/sockjs"),
        import("stompjs/lib/stomp.js"),
      ]);

      const SockJSCtor = sockjsPkg.default;
      const StompLib = stompPkg.default?.Stomp || stompPkg.Stomp;
      const sock = new SockJSCtor(wsBase);
      stompClient = StompLib.over(sock);
      stompClient.debug = null;

      stompClient.connect(
        {},
        () => {
          ready.value = "connected";

          stompClient.subscribe(`/topic/room.${roomId.value}`, (frame) => {
            const msg = safeParse(frame.body);
            if (msg) handlers.onRoomMessage?.(msg);
          });

          stompClient.subscribe(`/topic/room-info.${roomId.value}`, (frame) => {
            const info = safeParse(frame.body);
            if (info) handlers.onRoomInfo?.(info);
          });

          stompClient.subscribe(
            `/topic/room-history.${roomId.value}`,
            (frame) => {
              const list = safeParse(frame.body);
              if (Array.isArray(list)) handlers.onRoomHistory?.(list);
            },
          );

          stompClient.subscribe("/user/queue/errors", (frame) => {
            handlers.onSocketError?.(frame.body);
          });

          handlers.onConnected?.();
        },
        () => {
          ready.value = "disconnected";
          handlers.onDisconnected?.();
        },
      );
    } catch {
      ready.value = "disconnected";
      handlers.onDisconnected?.();
    }
  }

  function disconnect() {
    if (stompClient && typeof stompClient.disconnect === "function") {
      stompClient.disconnect();
    }
    ready.value = "disconnected";
  }

  function isConnected() {
    return Boolean(stompClient && stompClient.connected);
  }

  function sendChat(content) {
    if (!isConnected()) return;
    stompClient.send(
      "/app/chat.send",
      {},
      JSON.stringify({
        roomId: roomId.value,
        senderId: myName.value || myId,
        content,
      }),
    );
  }

  function sendRoom(payload) {
    if (!isConnected()) return;
    stompClient.send(
      "/app/room.update",
      {},
      JSON.stringify({ origin: myId, roomId: roomId.value, ...payload }),
    );
  }

  function requestHistory() {
    if (!isConnected()) return;
    stompClient.send(
      "/app/chat.history",
      {},
      JSON.stringify({ roomId: roomId.value }),
    );
  }

  return {
    ready,
    connect,
    disconnect,
    sendChat,
    sendRoom,
    requestHistory,
    isConnected,
  };
}
