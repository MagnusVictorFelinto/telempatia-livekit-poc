import { useRoomContext, useRemoteParticipants } from "@livekit/components-react";
import { useDataChat } from "../../hooks/useDataChat";
import type { Role } from "../../lib/types";
import ChatPanel from "../ChatPanel";

interface Props {
  selfName: string;
  selfRole: Role;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Chat do dashboard do especialista: mesma lógica de useDataChat já usada na
// sala simples, só que com um cabeçalho mostrando quem é o outro
// participante conectado na sala (nome real do LiveKit, não mockado).
export default function SpecialistChatPanel({ selfName, selfRole }: Props) {
  const room = useRoomContext();
  const remoteParticipants = useRemoteParticipants();
  const { messages, sendMessage } = useDataChat(room, selfName, selfRole);

  const peer = remoteParticipants[0];
  const peerName = peer?.name || peer?.identity || "Aguardando participante";

  return (
    <ChatPanel
      messages={messages}
      onSend={sendMessage}
      header={{
        initials: initialsOf(peerName),
        title: "Chat",
        subtitle: peerName,
      }}
    />
  );
}
