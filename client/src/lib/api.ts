import type { JoinInfo, RoomResponse, TokenResponse, UploadedFile } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

/**
 * Token da API principal (Nest). Enquanto o web não tiver login próprio, pode
 * vir de VITE_AUTH_TOKEN. Quando o servidor roda com AUTH_REQUIRED=true, sem
 * isso as chamadas voltam 401.
 */
let authToken: string | null = (import.meta.env.VITE_AUTH_TOKEN as string | undefined) ?? null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

function authHeaders(): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erro na requisição (${res.status})`);
  }
  return res.json() as Promise<T>;
}

/**
 * Resolve o roomName a partir do id do atendimento. É o caminho correto em
 * produção: o especialista não digita nome de sala, ele abre um atendimento.
 * Retorna null quando não existe sala registrada para esse atendimento.
 */
export async function resolveRoomByAtendimento(atendimentoId: string): Promise<string | null> {
  const res = await fetch(
    `${API_URL}/api/rooms/por-atendimento/${encodeURIComponent(atendimentoId)}`,
    { headers: authHeaders() },
  );
  if (res.status === 404) return null;
  const data = await handle<RoomResponse>(res);
  return data.roomName;
}

/**
 * Garante o registro da sala. Sem `roomName`, o servidor gera um nome opaco
 * e o devolve — é assim que o nome deve nascer.
 */
export async function ensureRoom(params: {
  atendimentoId?: string;
  roomName?: string;
}): Promise<string> {
  const res = await fetch(`${API_URL}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(params),
  });
  const data = await handle<RoomResponse>(res);
  return data.roomName;
}

export async function fetchToken(info: JoinInfo): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(info),
  });
  return handle<TokenResponse>(res);
}

export async function uploadFile(roomId: string, file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("roomId", roomId);
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  const data = await handle<{ file: UploadedFile }>(res);
  return data.file;
}

export async function listUploads(roomId: string): Promise<UploadedFile[]> {
  const res = await fetch(`${API_URL}/api/uploads/${encodeURIComponent(roomId)}`, {
    headers: authHeaders(),
  });
  const data = await handle<{ files: UploadedFile[] }>(res);
  return data.files;
}

export function resolveDownloadUrl(downloadUrl: string): string {
  return `${API_URL}${downloadUrl}`;
}
