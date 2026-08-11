import { useEffect, useRef, useState, useCallback } from "react";
import { RoomEvent, type Room, type RemoteParticipant } from "livekit-client";
import type { ChatMessage, Role } from "../lib/types";

interface WirePayload {
  id: string;
  senderName: string;
  role: Role;
  text: string;
  timestamp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Chat simples via Data Channel do LiveKit (topic "chat").
 * Nada é persistido: o histórico vive somente em memória do componente
 * enquanto a sala estiver aberta.
 */
export function useDataChat(room: Room | undefined, selfName: string, selfRole: Role) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const roomRef = useRef(room);
  roomRef.current = room;

  useEffect(() => {
    if (!room) return;

    function handleData(
      payload: Uint8Array,
      participant?: RemoteParticipant,
      _kind?: unknown,
      topic?: string,
    ) {
      if (topic !== "chat") return;
      try {
        const parsed = JSON.parse(decoder.decode(payload)) as WirePayload;
        setMessages((prev) => [
          ...prev,
          {
            id: parsed.id,
            senderIdentity: participant?.identity ?? "desconhecido",
            senderName: parsed.senderName,
            role: parsed.role,
            text: parsed.text,
            timestamp: parsed.timestamp,
            self: false,
          },
        ]);
      } catch (err) {
        console.error("Mensagem de chat inválida recebida", err);
      }
    }

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  const sendMessage = useCallback(
    async (text: string) => {
      const current = roomRef.current;
      if (!current || !text.trim()) return;

      const payload: WirePayload = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        senderName: selfName,
        role: selfRole,
        text: text.trim(),
        timestamp: Date.now(),
      };

      await current.localParticipant.publishData(encoder.encode(JSON.stringify(payload)), {
        reliable: true,
        topic: "chat",
      });

      setMessages((prev) => [
        ...prev,
        {
          id: payload.id,
          senderIdentity: current.localParticipant.identity,
          senderName: payload.senderName,
          role: payload.role,
          text: payload.text,
          timestamp: payload.timestamp,
          self: true,
        },
      ]);
    },
    [selfName, selfRole],
  );

  return { messages, sendMessage };
}
