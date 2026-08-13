# Prompt — Integração LiveKit no app mobile (Expo)

> Cole o conteúdo abaixo da linha na IA que já tem contexto do repositório do app mobile.

---

## Contexto

Você já conhece este projeto Expo/React Native. Vamos tornar **funcional** a tela de
teleconsulta que já existe no app (a tela para onde o usuário é levado **depois da fila**).
Hoje ela é apenas visual/mockada — o objetivo é conectá-la ao nosso backend real e ao
LiveKit.

**Não redesenhe a tela.** O layout, cores, tipografia e navegação atuais devem ser
preservados. O trabalho é de integração: substituir mocks por dados/streams reais e
ligar os botões existentes às ações do LiveKit.

O usuário do app é sempre o **médico solicitante** (`role: "medico_solicitante"`).
O especialista atende pelo cliente web — não precisamos implementar esse papel aqui.

## Backend atual (já existe, não alterar a API)

Express + TypeScript, porta `4000`. Servidor LiveKit rodando em Docker em modo `--dev`
na porta `7880` (WebSocket) / `7881` (TCP) / `50000-50100/udp` (mídia).

### `POST /api/rooms`

```jsonc
// request
{ "roomName": "caso-123" }
// 201
{ "room": { "id": "caso-123", "createdAt": "..." } }
```

Idempotente (upsert). Chame antes de entrar na sala para garantir o registro.

### `POST /api/token`

```jsonc
// request
{
  "roomName": "caso-123",
  "participantName": "Dra. Ana",
  "role": "medico_solicitante"   // ou "especialista"
}
// 200
{
  "token": "<JWT>",
  "identity": "Dra. Ana-a1b2c3",   // gerado no servidor, com sufixo aleatório
  "livekitUrl": "ws://localhost:7880"
}
```

O `role` vai no `metadata` do participante como `JSON.stringify({ role })` — use isso
para rotular quem é quem na UI. Grants: `roomJoin`, `canPublish`, `canSubscribe`,
`canPublishData`.

### `POST /api/upload`

`multipart/form-data` com os campos `roomId` (string) e `file`. Limite de 50 MB.

```jsonc
// 201
{ "file": { "id": "...", "roomId": "caso-123", "storedName": "k60oheRk3n.pdf",
            "originalName": "exame.pdf", "mimeType": "application/pdf",
            "size": 123456, "uploadedAt": "...", "downloadUrl": "/files/caso-123/k60oheRk3n.pdf" } }
```

### `GET /api/uploads/:roomId`

```jsonc
{ "files": [ /* mesmo shape acima, ordenado por uploadedAt asc */ ] }
```

### `GET /files/:roomId/:arquivo`

Download direto (estático). O `downloadUrl` vem **relativo** — concatene com a base da API.

### `GET /api/health`

`{ "ok": true }` — útil para diagnosticar conectividade a partir do device.

## Protocolo do chat (Data Channel do LiveKit)

O chat **não passa pelo backend** e **não é persistido** — é `publishData` no topic
`"chat"`, reliable. Precisa ser byte-a-byte compatível com o cliente web, que envia:

```ts
// JSON.stringify(payload) → TextEncoder → publishData(bytes, { reliable: true, topic: "chat" })
interface WirePayload {
  id: string;          // `${Date.now()}-${random}`
  senderName: string;
  role: "medico_solicitante" | "especialista";
  text: string;
  timestamp: number;   // Date.now()
}
```

Ao receber: filtre por `topic === "chat"`, decodifique, faça `JSON.parse`, e use
`participant.identity` para identificar o remetente. Mensagens próprias devem ser
adicionadas otimisticamente ao estado local (o LiveKit não ecoa de volta para quem
publicou).

## Requisitos técnicos do Expo

**Expo Go não funciona** — o LiveKit usa código nativo (WebRTC). É obrigatório um
**development build**.

Dependências:

```bash
npx expo install @livekit/react-native @livekit/react-native-webrtc \
  @livekit/react-native-expo-plugin @config-plugins/react-native-webrtc \
  expo-build-properties expo-document-picker expo-file-system expo-sharing
```

`app.json` / `app.config.ts`:

```jsonc
{
  "expo": {
    "plugins": [
      "@livekit/react-native-expo-plugin",
      "@config-plugins/react-native-webrtc",
      ["expo-build-properties", {
        "android": { "minSdkVersion": 24, "usesCleartextTraffic": true },
        "ios": { "deploymentTarget": "13.4" }
      }]
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Usamos a câmera para a teleconsulta.",
        "NSMicrophoneUsageDescription": "Usamos o microfone para a teleconsulta.",
        "NSLocalNetworkUsageDescription": "Conexão com o servidor de vídeo na rede local.",
        "NSAppTransportSecurity": { "NSAllowsLocalNetworking": true }
      }
    },
    "android": {
      "permissions": ["CAMERA", "RECORD_AUDIO", "MODIFY_AUDIO_SETTINGS"]
    }
  }
}
```

Depois: `npx expo prebuild --clean` e `npx expo run:android` / `npx expo run:ios`
(ou um dev build via EAS).

Pontos de atenção do SDK React Native:

- `registerGlobals()` do `@livekit/react-native` deve ser chamado **uma vez, no entry
  point** (`index.js` / `_layout.tsx` raiz), antes de qualquer import de sala.
- `AudioSession.startAudioSession()` ao entrar na chamada e `stopAudioSession()` ao sair
  — sem isso o áudio não sai no device.
- Renderize vídeo com `<VideoTrack trackRef={...} />` (não existe `<video>`; nada de
  `@livekit/components-react`, que é só web).
- Peça permissões de câmera/microfone **antes** de conectar, com tratamento de negação.
- Trocar câmera frontal/traseira: `restartTrack({ facingMode: 'environment' | 'user' })`
  na `LocalVideoTrack` da câmera.

## Configuração de rede (dev)

O device físico não enxerga `localhost` da máquina de desenvolvimento. Use o **IP da LAN**
(mesma rede Wi-Fi):

```
EXPO_PUBLIC_API_URL=http://192.168.X.Y:4000
EXPO_PUBLIC_LIVEKIT_URL=ws://192.168.X.Y:7880
```

Regras:

1. O `livekitUrl` devolvido pelo `/api/token` vem do `.env` do servidor e hoje é
   `ws://localhost:7880` — **inútil no device**. Trate `EXPO_PUBLIC_LIVEKIT_URL` como
   override quando definido, com fallback para o valor da resposta.
2. Deixe a base da API centralizada num único módulo de config, fácil de trocar para
   staging/produção depois.
3. CORS não se aplica a requisições nativas do RN, então o `CLIENT_ORIGIN` do backend não
   bloqueia o app.
4. A faixa UDP `50000-50100` precisa estar liberada no firewall da máquina dev, senão o
   vídeo conecta e fica preto.

## Escopo desta entrega

1. **Vídeo e áudio bidirecionais** com o especialista na mesma sala, mais os controles já
   presentes na tela: mutar microfone, ligar/desligar câmera, alternar câmera
   frontal/traseira e encerrar a chamada (desconectar + parar audio session + voltar na
   navegação).
2. **Chat** via Data Channel, no protocolo descrito acima, plugado na UI de chat existente.
3. **Envio e download de arquivos**: `expo-document-picker` para escolher, `POST /api/upload`
   para enviar, `GET /api/uploads/:roomId` para listar (polling de 5s, igual ao web) e
   `expo-file-system` + `expo-sharing` para baixar/abrir.

Estados de UI que precisam ser tratados: conectando, reconectando, erro de token, permissão
negada, participante remoto ainda não entrou, e desconexão remota.

## Como quero o trabalho conduzido

1. Antes de escrever código, **inspecione o projeto** e me diga: qual arquivo é a tela
   pós-fila, de onde vêm hoje `roomName` e o nome do médico, e como a navegação chega até
   ela. Se `roomName` ainda não existir no fluxo da fila, proponha de onde tirá-lo.
2. Me apresente um plano curto de arquivos a criar/alterar antes de implementar.
3. Prefira uma camada fina e isolada — algo como `src/lib/livekit/` (config, cliente de API,
   hook de conexão, hook de chat) — para que a tela só consuma hooks e continue legível.
4. Mantenha TypeScript estrito, sem `any` solto, e comentários em português apenas onde a
   decisão não for óbvia.
5. Ao final, escreva um passo a passo de teste: subir docker/backend, descobrir o IP da LAN,
   gerar o dev build, e validar a chamada com o cliente web na outra ponta.

Se algo do backend estiver faltando para fechar o fluxo, **me diga em vez de inventar** —
o servidor eu ajusto do outro lado.
