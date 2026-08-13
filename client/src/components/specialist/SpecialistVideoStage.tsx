import { GridLayout, RoomAudioRenderer, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import SpecialistControls from "./SpecialistControls";
import NamedParticipantTile from "./NamedParticipantTile";

// Grade de vídeo do especialista, com a barra de ações da consulta
// (Receitar / Encerrar temporariamente / Finalizar atendimento).
//
// Usa NamedParticipantTile em vez do ParticipantTile padrão porque o identity
// virou UUID opaco — o nome de exibição vem do metadata do participante.
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
          <NamedParticipantTile />
        </GridLayout>
      </div>
      <SpecialistControls />
      <RoomAudioRenderer />
    </div>
  );
}
