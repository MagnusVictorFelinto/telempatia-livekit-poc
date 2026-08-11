import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import tokenRouter from "./routes/token.js";
import roomsRouter from "./routes/rooms.js";
import uploadRouter from "./routes/upload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// Healthcheck simples para validar que o backend está de pé.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "telempatia-livekit-poc-server" });
});

app.use("/api/token", tokenRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api", uploadRouter);

// Serve os arquivos enviados para download direto (usado pelo painel de
// upload/download do front-end).
app.use("/files", express.static(path.join(__dirname, "uploads")));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : "Erro interno";
  res.status(500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`[server] rodando em http://localhost:${PORT}`);
});
