import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureRoom, resolveRoomByAtendimento } from "../lib/api";

// Cliente web = especialista. O médico solicitante entra pelo app mobile, que
// recebe o roomName direto do atendimento — ninguém digita nome de sala lá.
export default function JoinPage() {
  const navigate = useNavigate();
  const [participantName, setParticipantName] = useState("");
  const [referencia, setReferencia] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const nome = participantName.trim();
    const ref = referencia.trim();

    if (!nome || !ref) {
      setError("Preencha seu nome e o atendimento ou a sala.");
      return;
    }

    setLoading(true);
    try {
      // Caminho preferido: o valor informado é um id de atendimento e o
      // servidor devolve a sala já registrada para ele.
      let roomName = await resolveRoomByAtendimento(ref);

      // Fallback: o valor é o próprio roomName (útil em teste manual, e
      // enquanto o atendimento ainda não passa por POST /api/rooms).
      if (!roomName) {
        roomName = await ensureRoom({ roomName: ref });
      }

      navigate(`/room/${encodeURIComponent(roomName)}`, {
        state: { participantName: nome },
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
        <p className="card-subtitle">Acesso do especialista</p>

        <div className="field">
          <label htmlFor="name">Seu nome</label>
          <input
            id="name"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            placeholder="Ex.: Dra. Beatriz Souza"
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="ref">Atendimento ou sala</label>
          <input
            id="ref"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="Ex.: atd-9f1c8b2e4a7d6350"
          />
          <small className="field-hint">
            Informe o id do atendimento. Se não houver sala registrada para ele, o valor é
            usado como nome de sala.
          </small>
        </div>

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar na sala"}
        </button>

        {error && <p className="error-text">{error}</p>}
      </form>
    </div>
  );
}
