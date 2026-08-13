import { Router } from "express";
import { randomUUID } from "node:crypto";
import { AccessToken } from "livekit-server-sdk";
import { getLivekitCredentials, getLivekitWsUrl } from "../lib/livekit.js";
import { validateRoomName } from "../lib/roomName.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const ROLES = ["medico_solicitante", "especialista"] as const;
type Role = (typeof ROLES)[number];

interface TokenBody {
  roomName?: string;
  participantName?: string;
  role?: Role;
}

/**
 * Metadata do participante. É o único lugar onde trafega o nome real:
 * o `identity` é opaco justamente para não colocar nome de médico dentro do
 * JWT nem nos logs do SFU.
 */
interface ParticipantMetadata {
  role: Role;
  nomeExibicao: string;
}

// POST /api/token
//
// Gera o JWT que o cliente usa para conectar ao SFU.
//
// `identity` é um UUID opaco — não derive nada dele na UI. Para exibir quem é
// quem, leia `participant.metadata` e use `{ role, nomeExibicao }`.
router.post("/", requireAuth, async (req, res) => {
  const { roomName, participantName, role } = req.body as TokenBody;

  if (!roomName || !participantName || !role) {
    return res.status(400).json({
      error: "roomName, participantName e role são obrigatórios",
    });
  }

  const roomNameError = validateRoomName(roomName);
  if (roomNameError) {
    return res.status(400).json({ error: roomNameError });
  }

  if (!ROLES.includes(role)) {
    return res.status(400).json({
      error: `role inválido. Use um dos valores: ${ROLES.join(", ")}`,
    });
  }

  let apiKey: string;
  let apiSecret: string;
  try {
    ({ apiKey, apiSecret } = getLivekitCredentials());
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Credenciais do LiveKit ausentes",
    });
  }

  // Identity opaco: nada de nome real dentro do JWT ou dos logs do SFU.
  const identity = randomUUID();

  const metadata: ParticipantMetadata = {
    role,
    nomeExibicao: participantName.trim(),
  };

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    // `name` também é gravado no JWT e aparece nos logs do SFU; mantemos vazio
    // de propósito e deixamos o nome apenas no metadata.
    metadata: JSON.stringify(metadata),
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  res.json({
    token,
    identity,
    livekitUrl: getLivekitWsUrl(),
    metadata,
  });
});

export default router;
