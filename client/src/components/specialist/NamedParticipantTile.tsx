import { useContext } from "react";
import { TrackRefContext, VideoTrack, isTrackReference } from "@livekit/components-react";
import { displayNameOf, initialsOf, roleOf } from "../../lib/participants";
import { ROLE_LABELS } from "../../lib/types";

/**
 * Tile de participante próprio, em vez do <ParticipantTile /> padrão.
 *
 * Motivo: o `identity` agora é um UUID opaco (o nome real não entra mais no
 * JWT nem nos logs do SFU), e o tile padrão do LiveKit exibe
 * `name || identity` — mostraria o UUID na tela. Aqui lemos o nome do
 * `metadata` do participante, que é onde ele passou a viver.
 */
export default function NamedParticipantTile() {
  const trackRef = useContext(TrackRefContext);

  if (!trackRef) return null;

  const { participant } = trackRef;
  const name = displayNameOf(participant, "Participante");
  const role = roleOf(participant);

  return (
    <div className="named-tile">
      {isTrackReference(trackRef) && !trackRef.publication.isMuted ? (
        <VideoTrack trackRef={trackRef} className="named-tile-video" />
      ) : (
        <div className="named-tile-placeholder">
          <span className="named-tile-initials">{initialsOf(name)}</span>
        </div>
      )}

      <div className="named-tile-label">
        <strong>{name}</strong>
        {role && <span className="named-tile-role">{ROLE_LABELS[role]}</span>}
        {participant.isLocal && <span className="named-tile-role">você</span>}
      </div>
    </div>
  );
}
