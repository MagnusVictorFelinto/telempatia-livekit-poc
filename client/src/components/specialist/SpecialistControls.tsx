import { ControlBar, useRoomContext } from "@livekit/components-react";

// Barra de ações do especialista: ícones padrão do LiveKit (mic/câmera/
// compartilhar tela) + botões de ação da consulta. "Receitar" e "Encerrar
// temporariamente" são apenas visuais por enquanto (sem lógica de backend).
// "Finalizar atendimento" desconecta da sala de verdade — o
// onDisconnected do LiveKitRoom (em RoomPage) já cuida de voltar ao Join.
export default function SpecialistControls() {
  const room = useRoomContext();

  return (
    <div className="specialist-control-bar">
      <div className="specialist-control-bar-icons">
        <ControlBar controls={{ chat: false, screenShare: true, leave: false }} />
      </div>
      <div className="control-pills">
        <button className="control-pill control-pill-primary" title="Em breve">
          📝 Receitar
        </button>
        <button className="control-pill control-pill-warning" title="Em breve">
          ⏸ Encerrar temporariamente
        </button>
        <button
          className="control-pill control-pill-success"
          onClick={() => room?.disconnect()}
        >
          ✅ Finalizar atendimento
        </button>
      </div>
    </div>
  );
}
