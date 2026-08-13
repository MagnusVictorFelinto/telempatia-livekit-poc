import type { NextFunction, Request, Response } from "express";

/**
 * Autenticação por Bearer token da API principal (Nest).
 *
 * Ligada/desligada por `AUTH_REQUIRED`:
 *   - `false` (padrão em dev): o middleware apenas *tenta* identificar o
 *     usuário. Se houver token válido, popula `req.auth`; se não houver,
 *     deixa passar. Nada quebra no fluxo local.
 *   - `true` (staging/produção): sem token válido, responde 401.
 *
 * A validação é feita chamando `AUTH_VERIFY_URL` (ex.: o `/auth/me` da API
 * Nest) repassando o mesmo `Authorization`. Fazemos assim, em vez de validar
 * o JWT localmente, para não duplicar segredo nem lógica de expiração entre
 * dois serviços. O resultado fica em cache por `AUTH_CACHE_TTL_MS` para não
 * gerar uma chamada extra a cada request de listagem/download.
 */

export interface AuthUser {
  id?: string;
  [key: string]: unknown;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

const CACHE_TTL_MS = Number(process.env.AUTH_CACHE_TTL_MS ?? 60_000);

interface CacheEntry {
  user: AuthUser | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function isAuthRequired(): boolean {
  return String(process.env.AUTH_REQUIRED ?? "false").toLowerCase() === "true";
}

function extractToken(req: Request): string | null {
  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim() || null;
}

async function verifyToken(token: string): Promise<AuthUser | null> {
  const verifyUrl = process.env.AUTH_VERIFY_URL;

  if (!verifyUrl) {
    // Sem endpoint configurado não há como validar. Em modo obrigatório isso
    // é erro de configuração e precisa aparecer alto e claro no log.
    if (isAuthRequired()) {
      throw new Error("AUTH_REQUIRED=true, mas AUTH_VERIFY_URL não está configurado no .env");
    }
    return null;
  }

  const cached = cache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  let user: AuthUser | null = null;
  try {
    const res = await fetch(verifyUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(Number(process.env.AUTH_TIMEOUT_MS ?? 5000)),
    });
    if (res.ok) {
      user = (await res.json().catch(() => ({}))) as AuthUser;
    }
  } catch (err) {
    console.warn("[auth] falha ao validar token na API principal:", err);
    // Falha de rede não vira "autorizado". Cai no fluxo de 401 abaixo quando
    // AUTH_REQUIRED=true.
    return null;
  }

  cache.set(token, { user, expiresAt: Date.now() + CACHE_TTL_MS });
  return user;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const required = isAuthRequired();
  const token = extractToken(req);

  if (!token) {
    if (required) {
      return res.status(401).json({ error: "Authorization Bearer é obrigatório" });
    }
    return next();
  }

  try {
    const user = await verifyToken(token);
    if (!user && required) {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }
    if (user) req.auth = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * PENDENTE (depende da API Nest): além de autenticar, estes endpoints
 * deveriam conferir se o usuário do token é participante do atendimento
 * daquela sala. Hoje o servidor LiveKit não conhece atendimentos — assim que
 * a API expuser algo como `GET /atendimentos/por-sala/:roomName/participantes`
 * (ou o `roomName` passar a constar no perfil retornado pelo /auth/me),
 * plugue a checagem aqui.
 */
export function assertParticipantOfRoom(_req: Request, _roomId: string): void {
  // no-op por enquanto — ver comentário acima.
}
