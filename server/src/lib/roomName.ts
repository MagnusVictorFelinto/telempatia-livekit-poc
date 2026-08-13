import { randomUUID } from "node:crypto";

/**
 * Regras do `roomName` (contrato acordado com o app mobile):
 *
 * 1. Gerado no servidor, nunca pelo cliente.
 * 2. Imutável durante todo o ciclo de vida do atendimento (a sala não muda
 *    quando a modalidade troca entre chat / voz / vídeo).
 * 3. Único e nunca reutilizado.
 * 4. Idêntico para médico solicitante e especialista.
 * 5. Não adivinhável — `/api/uploads/:roomId` e `/files/:roomId/:arquivo`
 *    expõem exames de paciente e, enquanto AUTH_REQUIRED estiver desligado,
 *    o único obstáculo é a entropia do nome da sala.
 * 6. Seguro para URL e para o LiveKit: apenas [a-z0-9-].
 *
 * Formato: `atd-` + UUID v4 sem hífens (32 hex chars) → 128 bits de entropia.
 */

const ROOM_NAME_PATTERN = /^[a-z0-9-]{8,64}$/;
const ROOM_NAME_PREFIX = "atd-";

export function generateRoomName(): string {
  return `${ROOM_NAME_PREFIX}${randomUUID().replace(/-/g, "")}`;
}

export function isValidRoomName(value: string): boolean {
  return ROOM_NAME_PATTERN.test(value);
}

/**
 * Erro de validação com mensagem pronta para devolver ao cliente.
 * Retorna `null` quando o valor é válido.
 */
export function validateRoomName(value: string): string | null {
  if (!value.trim()) return "roomName é obrigatório";
  if (!isValidRoomName(value)) {
    return "roomName inválido: use apenas [a-z0-9-], de 8 a 64 caracteres";
  }
  return null;
}
