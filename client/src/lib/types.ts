export type Role = "medico_solicitante" | "especialista";

export const ROLE_LABELS: Record<Role, string> = {
  medico_solicitante: "Médico solicitante",
  especialista: "Especialista",
};

export interface JoinInfo {
  participantName: string;
  role: Role;
  roomName: string;
}

export interface TokenResponse {
  token: string;
  identity: string;
  livekitUrl: string;
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
