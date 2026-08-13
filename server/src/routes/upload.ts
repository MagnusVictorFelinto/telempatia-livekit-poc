import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import type { UploadFile } from "@prisma/client";
import { prisma } from "../prisma.js";
import { validateRoomName } from "../lib/roomName.js";
import { requireAuth } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");

/**
 * Limites de tamanho, alinhados com a regra de negócio do app:
 *   - vídeo: até 100 MB
 *   - demais tipos (imagem, PDF, ...): até 50 MB
 *
 * O multer só aceita um teto único, então configuramos o maior (100 MB) e
 * rejeitamos o excedente por tipo em `fileFilter` / após a gravação.
 */
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_OTHER_BYTES = 50 * 1024 * 1024;

function isVideo(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith("video/");
}

function maxBytesFor(mimeType: string): number {
  return isVideo(mimeType) ? MAX_VIDEO_BYTES : MAX_OTHER_BYTES;
}

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const roomId = (req.body?.roomId as string | undefined)?.trim();
    if (!roomId) {
      cb(new Error("roomId é obrigatório"), "");
      return;
    }
    const roomIdError = validateRoomName(roomId);
    if (roomIdError) {
      cb(new Error(roomIdError), "");
      return;
    }
    const dir = path.join(UPLOADS_ROOT, roomId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const storedName = `${nanoid(10)}${ext}`;
    cb(null, storedName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_BYTES },
});

const router = Router();

// POST /api/upload
// multipart/form-data com campos: roomId, file
router.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
  const roomId = (req.body?.roomId as string | undefined)?.trim();
  const file = req.file;

  if (!roomId) {
    return res.status(400).json({ error: "roomId é obrigatório" });
  }
  const roomIdError = validateRoomName(roomId);
  if (roomIdError) {
    return res.status(400).json({ error: roomIdError });
  }
  if (!file) {
    return res.status(400).json({ error: "Arquivo (campo 'file') é obrigatório" });
  }

  // Limite por tipo: o multer já barrou acima de 100 MB; aqui pegamos o caso
  // de um não-vídeo entre 50 e 100 MB. O arquivo já foi para o disco, então
  // removemos antes de responder.
  const limit = maxBytesFor(file.mimetype);
  if (file.size > limit) {
    await fs.promises.unlink(file.path).catch(() => {});
    return res.status(413).json({
      error: isVideo(file.mimetype)
        ? `Vídeo acima do limite de ${formatMb(MAX_VIDEO_BYTES)}`
        : `Arquivo acima do limite de ${formatMb(MAX_OTHER_BYTES)} para este tipo`,
      maxBytes: limit,
    });
  }

  // Garante que a sala existe no banco (cria se ainda não tiver sido
  // registrada via POST /api/rooms).
  await prisma.room.upsert({
    where: { id: roomId },
    update: {},
    create: { id: roomId },
  });

  const record = await prisma.uploadFile.create({
    data: {
      roomId,
      storedName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    },
  });

  res.status(201).json({
    file: {
      ...record,
      downloadUrl: `/files/${roomId}/${record.storedName}`,
    },
  });
});

// GET /api/uploads/:roomId
// Lista os arquivos já enviados nessa sala.
router.get("/uploads/:roomId", requireAuth, async (req, res) => {
  const { roomId } = req.params;

  const roomIdError = validateRoomName(roomId);
  if (roomIdError) {
    return res.status(400).json({ error: roomIdError });
  }

  const files = await prisma.uploadFile.findMany({
    where: { roomId },
    orderBy: { uploadedAt: "asc" },
  });

  res.json({
    files: files.map((f: UploadFile) => ({
      ...f,
      downloadUrl: `/files/${roomId}/${f.storedName}`,
    })),
  });
});

// GET /api/upload/limites
// O app usa isso para validar o arquivo antes de subir 100 MB à toa.
router.get("/upload/limites", (_req, res) => {
  res.json({
    video: MAX_VIDEO_BYTES,
    padrao: MAX_OTHER_BYTES,
  });
});

export default router;
