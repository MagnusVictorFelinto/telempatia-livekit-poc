import type { Participant } from "livekit-client";
import type { ParticipantMetadata, Role } from "./types";

const VALID_ROLES: Role[] = ["medico_solicitante", "especialista"];

/**
 * O backend gera `identity` como UUID opaco e coloca `{ role, nomeExibicao }`
 * no metadata. Nunca derive nome de exibição do identity.
 */
export function parseParticipantMetadata(raw?: string): ParticipantMetadata | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ParticipantMetadata>;
    if (!parsed.role || !VALID_ROLES.includes(parsed.role)) return null;
    return {
      role: parsed.role,
      nomeExibicao: parsed.nomeExibicao?.trim() || "Participante",
    };
  } catch {
    return null;
  }
}

export function displayNameOf(participant: Participant | undefined, fallback: string): string {
  if (!participant) return fallback;
  return parseParticipantMetadata(participant.metadata)?.nomeExibicao ?? fallback;
}

export function roleOf(participant: Participant | undefined): Role | null {
  return parseParticipantMetadata(participant?.metadata)?.role ?? null;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
