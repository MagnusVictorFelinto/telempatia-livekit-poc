import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import type { UploadFile } from "@prisma/client";
import { prisma } from "../prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const roomId = (req.body?.roomId as string | undefined)?.trim();
    if (!roomId) {
      cb(new Error("roomId é obrigatório"), "");
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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB, suficiente para a PoC
});

const router = Router();

// POST /api/upload
// multipart/form-data com campos: roomId, file
// Salva localmente em /server/src/uploads/<roomId>/ e registra os metadados
// no SQLite via Prisma.
router.post("/upload", upload.single("file"), async (req, res) => {
  const roomId = (req.body?.roomId as string | undefined)?.trim();
  const file = req.file;

  if (!roomId) {
    return res.status(400).json({ error: "roomId é obrigatório" });
  }
  if (!file) {
    return res.status(400).json({ error: "Arquivo (campo 'file') é obrigatório" });
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
router.get("/uploads/:roomId", async (req, res) => {
  const { roomId } = req.params;

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

export default router;
