import { GridLayout, ParticipantTile, RoomAudioRenderer, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import SpecialistControls from "./SpecialistControls";

// Mesma lógica de vídeo do VideoStage padrão, mas com a barra de ações do
// especialista (Receitar / Encerrar temporariamente / Finalizar atendimento)
// no lugar do ControlBar padrão.
export default function SpecialistVideoStage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <GridLayout tracks={tracks} style={{ height: "100%" }}>
          <ParticipantTile />
        </GridLayout>
      </div>
      <SpecialistControls />
      <RoomAudioRenderer />
    </div>
  );
}
