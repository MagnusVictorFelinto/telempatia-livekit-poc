import {
  GridLayout,
  ParticipantTile,
  useTracks,
  RoomAudioRenderer,
  ControlBar,
} from "@livekit/components-react";
import { Track } from "livekit-client";

// Painel de vídeo usando @livekit/components-react: grid de participantes
// (câmera + microfone) e barra de controles padrão (mute, câmera, sair).
export default function VideoStage() {
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
      <ControlBar controls={{ chat: false, screenShare: true, leave: true }} />
      <RoomAudioRenderer />
    </div>
  );
}
