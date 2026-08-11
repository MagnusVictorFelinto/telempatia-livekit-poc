import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

interface CreateRoomBody {
  roomName?: string;
}

// POST /api/rooms
// Cria (ou reaproveita, se já existir) o registro da sala no banco local.
// A criação da sala "de fato" no livekit-server acontece automaticamente
// quando o primeiro participante conecta (modo --dev), então aqui só
// garantimos que exista uma pasta lógica para agrupar os uploads.
router.post("/", async (req, res) => {
  const { roomName } = req.body as CreateRoomBody;

  if (!roomName || !roomName.trim()) {
    return res.status(400).json({ error: "roomName é obrigatório" });
  }

  const id = roomName.trim();

  const room = await prisma.room.upsert({
    where: { id },
    update: {},
    create: { id },
  });

  res.status(201).json({ room });
});

// GET /api/rooms/:roomId
router.get("/:roomId", async (req, res) => {
  const room = await prisma.room.findUnique({
    where: { id: req.params.roomId },
    include: { files: true },
  });

  if (!room) {
    return res.status(404).json({ error: "Sala não encontrada" });
  }

  res.json({ room });
});

export default router;
