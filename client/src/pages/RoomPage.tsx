import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { LiveKitRoom } from "@livekit/components-react";
import { fetchToken } from "../lib/api";
import { SELF_ROLE, type TokenResponse } from "../lib/types";
import QueueBar from "../components/specialist/QueueBar";
import PatientPanel from "../components/specialist/PatientPanel";
import SpecialistVideoStage from "../components/specialist/SpecialistVideoStage";
import SpecialistChatPanel from "../components/specialist/SpecialistChatPanel";

interface NavState {
  participantName: string;
}

// Dashboard do especialista: fila de atendimento e ficha do paciente
// (mockados), vídeo com barra de ações da consulta, e chat real via Data
// Channel. Este cliente atende exclusivamente o especialista — o médico
// solicitante usa o app mobile.
export default function RoomPage() {
  const { roomName = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as NavState | null;

  const [connInfo, setConnInfo] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state?.participantName) {
      // Recarregou a página ou entrou direto pela URL sem passar pelo Join.
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;
    fetchToken({ roomName, participantName: state.participantName, role: SELF_ROLE })
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
      <div className="specialist-layout">
        <QueueBar />
        <div className="specialist-body">
          <PatientPanel roomId={roomName} />
          <main className="specialist-video" data-lk-theme="default">
            <SpecialistVideoStage />
          </main>
          <aside className="specialist-chat">
            <SpecialistChatPanel selfName={state.participantName} />
          </aside>
        </div>
      </div>
    </LiveKitRoom>
  );
}
