import { RoomServiceClient } from "livekit-server-sdk";

/**
 * Credenciais e URLs do LiveKit, lidas do .env.
 *
 * - `LIVEKIT_URL`: URL WebSocket devolvida aos clientes (`ws://` / `wss://`).
 *   Em dev com device físico isso precisa ser o IP da LAN, não `localhost`,
 *   senão o celular tenta conectar em si mesmo. O app trata
 *   `EXPO_PUBLIC_LIVEKIT_URL` como override, mas em staging/produção o valor
 *   daqui é a fonte da verdade.
 * - `LIVEKIT_API_URL`: endpoint HTTP do SFU usado pelo server SDK para
 *   administrar salas. Se não informado, é derivado do `LIVEKIT_URL`.
 */

export function getLivekitCredentials(): { apiKey: string; apiSecret: string } {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET não configurados no .env");
  }

  return { apiKey, apiSecret };
}

export function getLivekitWsUrl(): string {
  return process.env.LIVEKIT_URL ?? "ws://localhost:7880";
}

export function getLivekitHttpUrl(): string {
  if (process.env.LIVEKIT_API_URL) return process.env.LIVEKIT_API_URL;
  return getLivekitWsUrl().replace(/^ws:/, "http:").replace(/^wss:/, "https:");
}

let cachedClient: RoomServiceClient | null = null;

export function getRoomService(): RoomServiceClient {
  if (!cachedClient) {
    const { apiKey, apiSecret } = getLivekitCredentials();
    cachedClient = new RoomServiceClient(getLivekitHttpUrl(), apiKey, apiSecret);
  }
  return cachedClient;
}

/**
 * Cria a sala no SFU antecipadamente (em vez de esperar o primeiro
 * participante conectar). Isso permite definir `emptyTimeout` e
 * `maxParticipants` e deixa a sala pronta antes de o médico entrar.
 *
 * Falha aqui não é fatal: o LiveKit cria a sala automaticamente no primeiro
 * `join`, então só logamos e seguimos — o objetivo é não derrubar o fluxo do
 * app se o SFU estiver momentaneamente indisponível.
 */
export async function ensureLivekitRoom(roomName: string): Promise<boolean> {
  try {
    await getRoomService().createRoom({
      name: roomName,
      // 10 min sem ninguém na sala antes de o SFU descartá-la.
      emptyTimeout: 60 * 10,
      // Médico solicitante + especialista. Ajuste se entrar um terceiro papel.
      maxParticipants: 2,
    });
    return true;
  } catch (err) {
    console.warn(`[livekit] não foi possível pré-criar a sala "${roomName}":`, err);
    return false;
  }
}
