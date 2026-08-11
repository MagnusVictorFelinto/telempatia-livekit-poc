import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { LiveKitRoom, useRoomContext } from "@livekit/components-react";
import { fetchToken } from "../lib/api";
import { ROLE_LABELS, type Role, type TokenResponse } from "../lib/types";
import { useDataChat } from "../hooks/useDataChat";
import VideoStage from "../components/VideoStage";
import ChatPanel from "../components/ChatPanel";
import UploadPanel from "../components/UploadPanel";
import QueueBar from "../components/specialist/QueueBar";
import PatientPanel from "../components/specialist/PatientPanel";
import SpecialistVideoStage from "../components/specialist/SpecialistVideoStage";
import SpecialistChatPanel from "../components/specialist/SpecialistChatPanel";

interface NavState {
  participantName: string;
  role: Role;
}

// Componente interno: só existe dentro do <LiveKitRoom>, então tem acesso
// ao `room` via useRoomContext() para plugar o chat por Data Channel.
function RoomSidebar({ roomId, participantName, role }: { roomId: string; participantName: string; role: Role }) {
  const room = useRoomContext();
  const { messages, sendMessage } = useDataChat(room, participantName, role);
  const [tab, setTab] = useState<"chat" | "files">("chat");

  return (
    <aside className="room-sidebar">
      <div className="sidebar-tabs">
        <button className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}>
          Chat
        </button>
        <button className={tab === "files" ? "active" : ""} onClick={() => setTab("files")}>
          Arquivos
        </button>
      </div>
      {tab === "chat" ? (
        <ChatPanel messages={messages} onSend={sendMessage} />
      ) : (
        <UploadPanel roomId={roomId} />
      )}
    </aside>
  );
}

// Dashboard completo para o papel "especialista": fila de atendimento e
// ficha do paciente (mockados), vídeo com barra de ações da consulta, e
// chat real via Data Channel. É o que aparece no mockup de referência.
function SpecialistDashboard({
  roomId,
  participantName,
  role,
}: {
  roomId: string;
  participantName: string;
  role: Role;
}) {
  return (
    <div className="specialist-layout">
      <QueueBar />
      <div className="specialist-body">
        <PatientPanel roomId={roomId} />
        <main className="specialist-video" data-lk-theme="default">
          <SpecialistVideoStage />
        </main>
        <aside className="specialist-chat">
          <SpecialistChatPanel selfName={participantName} selfRole={role} />
        </aside>
      </div>
    </div>
  );
}

export default function RoomPage() {
  const { roomName = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as NavState | null;

  const [connInfo, setConnInfo] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state?.participantName || !state?.role) {
      // Recarregou a página ou entrou direto pela URL sem passar pelo Join.
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;
    fetchToken({ roomName, participantName: state.participantName, role: state.role })
      .then((res) => {
        if (!cancelled) setConnInfo(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Falha ao gerar token");
      });

    return () => {
      cancelled = true;
    };
  }, [roomName, state, navigate]);

  if (error) {
    return (
      <div className="page">
        <div className="card">
          <h1>Não foi possível entrar na sala</h1>
          <p className="error-text">{error}</p>
          <button className="btn-primary" onClick={() => navigate("/")}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!connInfo || !state) {
    return (
      <div className="page">
        <p>Conectando à sala...</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={connInfo.token}
      serverUrl={connInfo.livekitUrl}
      connect
      video
      audio
      onDisconnected={() => navigate("/")}
      style={{ height: "100vh" }}
    >
      {/* data-lk-theme fica só na área de vídeo: o tema escuro do LiveKit
          define `color: #fff` na raiz e isso vazava (herdado) para o
          header, chat e painéis com fundo claro, deixando texto branco
          sobre branco. Escopando aqui, o resto da UI usa nossas próprias
          cores (index.css) normalmente. */}
      {state.role === "especialista" ? (
        <SpecialistDashboard
          roomId={roomName}
          participantName={state.participantName}
          role={state.role}
        />
      ) : (
        <div className="room-layout">
          <header className="room-header">
            <strong>Sala: {roomName}</strong>
            <span className="role-badge">
              {state.participantName} · {ROLE_LABELS[state.role]}
            </span>
          </header>
          <main className="room-video" data-lk-theme="default">
            <VideoStage />
          </main>
          <RoomSidebar roomId={roomName} participantName={state.participantName} role={state.role} />
        </div>
      )}
    </LiveKitRoom>
  );
}
