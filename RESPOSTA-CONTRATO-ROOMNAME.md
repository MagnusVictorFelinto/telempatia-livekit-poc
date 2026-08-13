# Resposta ao contrato `roomName` — o que foi implementado

> Do time do back-end (servidor LiveKit `:4000` + cliente web) para o time do app mobile.
> Responde ponto a ponto a seção 7 do documento de contrato.

## Resumo em uma linha

Tudo que depende **do servidor LiveKit (`:4000`) e do cliente web** está implementado.
O que ainda depende da **API Nest** está isolado atrás de uma única chamada
(`POST /api/rooms { atendimentoId }`) e listado na seção "Pendente do lado da Nest".

---

## 1. Nome do campo e onde ele aparece — **confirmado**

Campo: `roomName`, string. Sem renomeação.

O servidor LiveKit passou a ser a **fonte de verdade** do valor. Ele é criado uma única
vez por atendimento e recuperável de duas formas:

```jsonc
// POST /api/rooms  — idempotente por atendimento
{ "atendimentoId": "atd-9f1c..." }
// 201 na primeira vez, 200 nas seguintes, sempre com o MESMO roomName
{ "roomName": "atd-8374a44205b14622a784b752f236aa4c",
  "room": { "id": "atd-8374...", "atendimentoId": "atd-9f1c...", "createdAt": "..." },
  "created": true }
```

```jsonc
// GET /api/rooms/por-atendimento/:atendimentoId   (novo)
// 200
{ "roomName": "atd-8374a44205b14622a784b752f236aa4c", "room": { ... } }
// 404 se ainda não existe sala para esse atendimento
```

`atendimentoId` virou coluna **única** na tabela `Room` — é isso que garante, no nível do
banco, que um atendimento nunca ganhe duas salas e que o `roomName` seja imutável durante
todo o ciclo de vida, independente de troca de modalidade (chat ↔ voz ↔ vídeo).

## 2. Formato do valor — **`atd-` + UUID v4 sem hífens**

```
atd-8374a44205b14622a784b752f236aa4c    // 36 chars, 128 bits de entropia
```

Validador central em `server/src/lib/roomName.ts`, regex `^[a-z0-9-]{8,64}$`, aplicado em
**todos** os endpoints que recebem `roomName`/`roomId` — incluindo `/api/upload` e
`/api/uploads/:roomId`. Testado contra `../etc/passwd`, maiúsculas, espaço e `/`: todos
rejeitados com 400. Sem contador sequencial em lugar nenhum.

## 3. Criação da sala no LiveKit — **o back-end faz**

`POST /api/rooms` agora cria a sala no SFU via `RoomServiceClient` (server SDK), com
`emptyTimeout` de 10 min e `maxParticipants: 2`.

**Podem remover a chamada do app?** Ainda não — mantenham por enquanto. Enquanto a API
Nest não chamar `POST /api/rooms` no momento de criar o atendimento, o app é quem dispara
essa criação. Assim que a Nest assumir (ver pendências), avisamos e vocês removem o passo 2
da sequência. A chamada é idempotente, então manter não causa efeito colateral.

Falha ao pré-criar a sala no SFU **não** derruba a requisição: logamos um warning e
seguimos, porque o LiveKit cria a sala sozinho no primeiro `join`.

## 4. Autenticação — **implementada, ligada por flag**

Middleware em `server/src/middleware/auth.ts`, aplicado em `/api/token`, `/api/rooms`,
`/api/upload`, `/api/uploads/:roomId` e `/files/*`.

```bash
AUTH_REQUIRED=false        # dev — token opcional, nada quebra
AUTH_REQUIRED=true         # staging/prod — sem Bearer válido, 401
AUTH_VERIFY_URL=https://develop.api.telempatia.empatiamedica.com.br/auth/me
AUTH_CACHE_TTL_MS=60000    # cache por token, evita 1 chamada extra por polling
```

A validação repassa o `Authorization` recebido para a API Nest em vez de validar o JWT
localmente — assim não duplicamos segredo nem regra de expiração entre dois serviços.

**Sim, comecem a mandar o `Authorization` agora**, em todas as chamadas, inclusive no
`GET /files/:roomId/:arquivo`. Com `AUTH_REQUIRED=false` o header é aceito e ignorado, então
vocês podem subir isso sem esperar por nós — e quando virarmos a flag, nada quebra.

O `GET /api/health` passou a devolver `authRequired: true|false`, útil pra vocês
diagnosticarem em qual modo o ambiente está.

**O que ainda não dá para fazer:** conferir se o usuário do token é *participante daquele
atendimento*. O servidor `:4000` não conhece atendimentos. Deixamos o ponto de extensão
pronto (`assertParticipantOfRoom`, hoje no-op) — ver pendências.

## 5. `identity` opaco + `nomeExibicao` no metadata — **feito, e o web já foi ajustado**

```jsonc
// POST /api/token → 200
{
  "token": "<JWT>",
  "identity": "3f2a9c14-...",              // UUID v4 opaco, sem nome dentro
  "livekitUrl": "ws://192.168.0.10:7880",
  "metadata": { "role": "medico_solicitante", "nomeExibicao": "Dra. Ana" }
}
```

O `name` do participante no JWT ficou **vazio de propósito** — o nome real vive só no
`metadata`. Nada de nome de médico em JWT ou log do SFU.

**Isto é breaking change para vocês:** o cabeçalho da chamada não pode mais usar o
`identity`. Leiam `participant.metadata`, façam `JSON.parse` e usem `nomeExibicao`.

No web já fizemos o equivalente: substituímos o `<ParticipantTile />` padrão do LiveKit
(que exibe `name || identity`, ou seja, mostraria o UUID) por um tile próprio que lê o
metadata. Referência de implementação, se ajudar:
`client/src/lib/participants.ts` e `client/src/components/specialist/NamedParticipantTile.tsx`.

O `metadata` também volta na resposta do `/api/token`, então vocês têm o próprio
`nomeExibicao` sem precisar esperar o evento de conexão.

## 6. Limite de upload — **100 MB para vídeo, 50 MB para o resto**

Como vocês sugeriram. Validação por `mimeType`: `video/*` até 100 MB, demais tipos até
50 MB. Acima do teto vem **413** com mensagem específica por tipo (e o arquivo é removido
do disco antes da resposta, para não deixar lixo).

Para não hardcodar os números no app:

```jsonc
// GET /api/upload/limites   (novo, sem auth)
{ "video": 104857600, "padrao": 52428800 }
```

Podem remover o teto fixo de 50 MB e passar a validar por tipo.

---

## Pendente do lado da API Nest (não está neste repositório)

1. **Chamar `POST /api/rooms { atendimentoId }`** no momento em que o atendimento é
   criado, guardar o `roomName` devolvido e devolvê-lo em toda resposta que descreva um
   atendimento — aceitar a chamada da fila, GET por id, e o payload do especialista.
2. **Expor um jeito de checar participação** (ex.: `GET /atendimentos/:id/participantes`
   ou incluir os ids no `/auth/me`), para fecharmos a autorização por atendimento em
   `assertParticipantOfRoom`.

Enquanto (1) não existir, o fluxo funciona com o app chamando `POST /api/rooms` —
mas aí é o app que define quando a sala nasce, e o especialista precisa informar o
`atendimentoId` na tela de entrada do web (que já resolve o `roomName` via
`GET /api/rooms/por-atendimento/:id`).

## Outros ajustes que entraram junto

- **`livekitUrl`**: agora vem centralizado de `LIVEKIT_URL` (`server/src/lib/livekit.ts`),
  com `.env.example` documentando que em dev com celular físico o valor precisa ser o IP
  da LAN. O `EXPO_PUBLIC_LIVEKIT_URL` de vocês continua funcionando como override.
- **CORS**: `CLIENT_ORIGIN` aceita lista separada por vírgula. Não afeta o app.
- **Erro de limite do multer** virou 413 com JSON em vez de 500 genérico.
- **Web restrito ao especialista**: removemos o seletor de papel da tela de entrada. O
  papel `medico_solicitante` só sobrevive no web para interpretar o metadata de vocês.
- **`/files/*`** passou a atravessar o middleware de auth junto com o resto.

## Como aplicar (o schema mudou)

```bash
cd server
npm run prisma:generate      # ou: npx prisma migrate deploy && npx prisma generate
npm run dev
```

A migration `20260812120000_room_atendimento_id` só adiciona coluna e índice único —
não destrói dado existente.
