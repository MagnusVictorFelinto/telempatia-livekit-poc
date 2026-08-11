import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../lib/api";
import { ROLE_LABELS, type Role } from "../lib/types";

export default function JoinPage() {
  const navigate = useNavigate();
  const [participantName, setParticipantName] = useState("");
  const [role, setRole] = useState<Role>("medico_solicitante");
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!participantName.trim() || !roomName.trim()) {
      setError("Preencha seu nome e o nome da sala.");
      return;
    }

    setLoading(true);
    try {
      await createRoom(roomName.trim());
      navigate(`/room/${encodeURIComponent(roomName.trim())}`, {
        state: { participantName: participantName.trim(), role },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar na sala");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Entrar na teleconsulta</h1>

        <div className="field">
          <label htmlFor="name">Seu nome</label>
          <input
            id="name"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            placeholder="Ex.: Dra. Ana Souza"
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="role">Papel</label>
          <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="room">Nome da sala</label>
          <input
            id="room"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Ex.: caso-123"
          />
        </div>

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar na sala"}
        </button>

        {error && <p className="error-text">{error}</p>}
      </form>
    </div>
  );
}
