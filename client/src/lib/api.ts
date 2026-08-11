import type { JoinInfo, TokenResponse, UploadedFile } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erro na requisição (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function createRoom(roomName: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomName }),
  });
  await handle(res);
}

export async function fetchToken(info: JoinInfo): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    body: formData,
  });
  const data = await handle<{ file: UploadedFile }>(res);
  return data.file;
}

export async function listUploads(roomId: string): Promise<UploadedFile[]> {
  const res = await fetch(`${API_URL}/api/uploads/${encodeURIComponent(roomId)}`);
  const data = await handle<{ files: UploadedFile[] }>(res);
  return data.files;
}

export function resolveDownloadUrl(downloadUrl: string): string {
  return `${API_URL}${downloadUrl}`;
}
