import { useRoomContext, useRemoteParticipants } from "@livekit/components-react";
import { useDataChat } from "../../hooks/useDataChat";
import { displayNameOf, initialsOf } from "../../lib/participants";
import { SELF_ROLE } from "../../lib/types";
import ChatPanel from "../ChatPanel";

interface Props {
  selfName: string;
}

// Chat do dashboard do especialista, com cabeçalho mostrando quem é o outro
// participante conectado. O nome vem do metadata do LiveKit (o identity é um
// UUID opaco e não deve aparecer na UI).
export default function SpecialistChatPanel({ selfName }: Props) {
  const room = useRoomContext();
  const remoteParticipants = useRemoteParticipants();
  const { messages, sendMessage } = useDataChat(room, selfName, SELF_ROLE);

  const peer = remoteParticipants[0];
  const peerName = displayNameOf(peer, "Aguardando participante");

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
