// O cliente web é exclusivo do especialista. O papel do médico solicitante
// existe aqui apenas para interpretar o metadata do participante remoto (o
// app mobile), nunca para ser selecionado nesta interface.
export type Role = "medico_solicitante" | "especialista";

export const ROLE_LABELS: Record<Role, string> = {
  medico_solicitante: "Médico solicitante",
  especialista: "Especialista",
};

/** Papel fixo deste cliente. */
export const SELF_ROLE: Role = "especialista";

export interface JoinInfo {
  participantName: string;
  role: Role;
  roomName: string;
}

/**
 * Metadata do participante no LiveKit. O `identity` é um UUID opaco (não
 * contém nome real, por LGPD), então TODO nome exibido na UI vem daqui.
 */
export interface ParticipantMetadata {
  role: Role;
  nomeExibicao: string;
}

export interface TokenResponse {
  token: string;
  identity: string;
  livekitUrl: string;
  metadata: ParticipantMetadata;
}

export interface RoomResponse {
  roomName: string;
  room: { id: string; atendimentoId: string | null; createdAt: string };
  created?: boolean;
}

export interface UploadedFile {
  id: string;
  roomId: string;
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  downloadUrl: string;
}

export interface ChatMessage {
  id: string;
  senderIdentity: string;
  senderName: string;
  role: Role;
  text: string;
  timestamp: number;
  self: boolean;
}
