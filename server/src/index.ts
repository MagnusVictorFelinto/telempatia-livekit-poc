import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";

import tokenRouter from "./routes/token.js";
import roomsRouter from "./routes/rooms.js";
import uploadRouter from "./routes/upload.js";
import { isAuthRequired, requireAuth } from "./middleware/auth.js";
import { prisma } from "./prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

// Aceita uma lista separada por vírgula (cliente web local, staging, etc.).
// O app mobile é requisição nativa e ignora CORS — isso aqui é só para o web.
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Sem Origin = curl, app nativo, health check. Libera.
      if (!origin) return cb(null, true);
      cb(null, CLIENT_ORIGINS.includes(origin));
    },
  }),
);
app.use(express.json());

// Healthcheck simples para validar que o backend está de pé (útil para
// diagnosticar conectividade a partir do device físico).
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "telempatia-livekit-poc-server",
    authRequired: isAuthRequired(),
  });
});

app.use("/api/token", tokenRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api", uploadRouter);

// Download direto dos arquivos enviados. Passa pelo mesmo middleware de auth
// dos demais endpoints — são exames de paciente, não podem ficar públicos
// quando AUTH_REQUIRED=true.
app.use("/files", requireAuth, express.static(path.join(__dirname, "uploads")));

const MIGRACAO_PENDENTE =
  "Banco desatualizado: rode `npx prisma migrate deploy && npx prisma generate` na pasta server/.";

function isSchemaOutOfSync(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  // P2021 = tabela inexistente, P2022 = coluna inexistente.
  if (code === "P2021" || code === "P2022") return true;
  const message = err instanceof Error ? err.message : "";
  return /no such column|no such table/i.test(message);
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Erro de limite do multer vira 413 com mensagem clara em vez de 500.
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Arquivo acima do limite de 100 MB" });
  }

  if (isSchemaOutOfSync(err)) {
    console.error(`[server] ${MIGRACAO_PENDENTE}`);
    return res.status(500).json({ error: MIGRACAO_PENDENTE });
  }

  console.error(err);
  const message = err instanceof Error ? err.message : "Erro interno";
  res.status(500).json({ error: message });
});

// Rede de segurança: sem isto, qualquer rejeição não tratada derruba o
// processo no Node 18+ e o navegador vê ERR_CONNECTION_REFUSED em vez de um
// erro HTTP. Preferimos o servidor de pé com log do que morto em silêncio.
process.on("unhandledRejection", (reason) => {
  console.error("[server] unhandledRejection:", reason);
});

// Checagem de schema no boot: falha barulhenta e específica, em vez de o
// primeiro request explodir com um stack trace gigante do Prisma.
async function checarSchema(): Promise<void> {
  try {
    await prisma.room.findFirst({ select: { atendimentoId: true } });
  } catch (err) {
    if (isSchemaOutOfSync(err)) {
      console.error(`\n[server] ERRO: ${MIGRACAO_PENDENTE}\n`);
    } else {
      console.warn("[server] não foi possível checar o schema no boot:", err);
    }
  }
}

app.listen(PORT, async () => {
  console.log(`[server] rodando em http://localhost:${PORT}`);
  console.log(`[server] autenticação obrigatória: ${isAuthRequired()}`);
  if (!isAuthRequired()) {
    console.warn(
      "[server] AVISO: AUTH_REQUIRED=false — /api/token, /api/upload, /api/uploads e /files estão abertos. Não usar assim com dado real.",
    );
  }
  await checarSchema();
});
