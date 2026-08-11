import { Router } from "express";
import { AccessToken } from "livekit-server-sdk";

const router = Router();

const ROLES = ["medico_solicitante", "especialista"] as const;
type Role = (typeof ROLES)[number];

interface TokenBody {
  roomName?: string;
  participantName?: string;
  role?: Role;
}

// POST /api/token
// Gera um JWT (via livekit-server-sdk) que o cliente usa para conectar ao
// livekit-server local. O papel do participante vai nos metadata, para que
// o front-end possa exibir/identificar quem é médico solicitante x especialista.
router.post("/", async (req, res) => {
  const { roomName, participantName, role } = req.body as TokenBody;

  if (!roomName || !participantName || !role) {
    return res.status(400).json({
      error: "roomName, participantName e role são obrigatórios",
    });
  }

  if (!ROLES.includes(role)) {
    return res.status(400).json({
      error: `role inválido. Use um dos valores: ${ROLES.join(", ")}`,
    });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({
      error: "LIVEKIT_API_KEY / LIVEKIT_API_SECRET não configurados no .env",
    });
  }

  const identity = `${participantName}-${Math.random().toString(36).slice(2, 8)}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: participantName,
    metadata: JSON.stringify({ role }),
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
    livekitUrl: process.env.LIVEKIT_URL ?? "ws://localhost:7880",
  });
});

export default router;
