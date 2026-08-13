import { Router } from "express";
import { prisma } from "../prisma.js";
import { generateRoomName, validateRoomName } from "../lib/roomName.js";
import { ensureLivekitRoom } from "../lib/livekit.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

interface CreateRoomBody {
  /** Opcional. Quando informado, garante idempotência real por atendimento. */
  atendimentoId?: string;
  /**
   * Opcional e legado. Se vier, precisa respeitar o formato [a-z0-9-].
   * O fluxo recomendado é NÃO enviar e deixar o servidor gerar.
   */
  roomName?: string;
}

// POST /api/rooms
//
// Duas formas de uso:
//
//  a) `{ "atendimentoId": "atd-9f1c..." }` — recomendado. O servidor gera o
//     roomName na primeira chamada e devolve SEMPRE o mesmo valor nas
//     seguintes. É o que garante que médico e especialista cheguem à mesma
//     sala sem ninguém digitar nada.
//
//  b) `{ "roomName": "..." }` — legado/rede de segurança. Faz upsert do nome
//     recebido, validando o formato.
//
// Em ambos os casos a sala é pré-criada no SFU via server SDK.
router.post("/", requireAuth, async (req, res) => {
  const { atendimentoId, roomName } = req.body as CreateRoomBody;

  if (atendimentoId?.trim()) {
    const id = atendimentoId.trim();

    const existing = await prisma.room.findUnique({ where: { atendimentoId: id } });
    if (existing) {
      await ensureLivekitRoom(existing.id);
      return res.status(200).json({ room: existing, roomName: existing.id, created: false });
    }

    const room = await prisma.room.create({
      data: { id: generateRoomName(), atendimentoId: id },
    });
    await ensureLivekitRoom(room.id);
    return res.status(201).json({ room, roomName: room.id, created: true });
  }

  // Sem atendimentoId: gera um nome opaco se o cliente não mandou nenhum.
  const requested = roomName?.trim();

  if (requested) {
    const error = validateRoomName(requested);
    if (error) return res.status(400).json({ error });
  }

  const id = requested ?? generateRoomName();

  const room = await prisma.room.upsert({
    where: { id },
    update: {},
    create: { id },
  });

  await ensureLivekitRoom(room.id);

  res.status(201).json({ room, roomName: room.id, created: !requested });
});

// GET /api/rooms/:roomId
router.get("/:roomId", requireAuth, async (req, res) => {
  const room = await prisma.room.findUnique({
    where: { id: req.params.roomId },
    include: { files: true },
  });

  if (!room) {
    return res.status(404).json({ error: "Sala não encontrada" });
  }

  res.json({ room });
});

// GET /api/rooms/por-atendimento/:atendimentoId
// Permite ao cliente web (especialista) resolver a sala a partir do
// atendimento, sem precisar que alguém digite o nome.
router.get("/por-atendimento/:atendimentoId", requireAuth, async (req, res) => {
  const room = await prisma.room.findUnique({
    where: { atendimentoId: req.params.atendimentoId },
  });

  if (!room) {
    return res.status(404).json({ error: "Nenhuma sala para esse atendimento" });
  }

  res.json({ room, roomName: room.id });
});

export default router;
