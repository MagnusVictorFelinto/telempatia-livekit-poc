# telempatia-livekit-poc

PoC monolítica para testar as funcionalidades do [LiveKit](https://livekit.io/) localmente:
videoconferência, chat via Data Channel e upload/download de arquivos por sala.

## Stack

- **livekit-server** rodando em modo `--dev` via Docker Compose.
- **Backend** (`/server`): Node.js + Express + TypeScript + Prisma (SQLite) + `livekit-server-sdk`.
- **Frontend** (`/client`): React (Vite) + TypeScript + `livekit-client` / `@livekit/components-react`.

## Estrutura

```
telempatia-livekit-poc/
├── docker-compose.yml       # livekit-server em modo --dev
├── server/                  # API Express (token, salas, upload/download)
│   ├── prisma/schema.prisma
│   └── src/
│       ├── routes/{token,rooms,upload}.ts
│       └── uploads/<roomId>/   # arquivos enviados, salvos localmente
└── client/                  # React + Vite
    └── src/
        ├── pages/{JoinPage,RoomPage}.tsx
        ├── components/{VideoStage,ChatPanel,UploadPanel}.tsx
        └── hooks/useDataChat.ts
```

## Pré-requisitos

- Node.js 18+
- Docker e Docker Compose

## Como rodar localmente

### 1. Suba o LiveKit server

Na raiz do projeto:

```bash
docker compose up
```

Isso sobe o `livekit-server` em modo `--dev` (credenciais padrão `devkey` /
`secret`), escutando em `ws://localhost:7880`.

### 2. Backend

```bash
cd server
cp .env.example .env
npm install
npm run prisma:migrate   # cria o SQLite (server/prisma/dev.db) e as tabelas
npm run dev              # inicia em http://localhost:4000
```

O `.env` já aponta para as credenciais padrão do modo `--dev` do LiveKit
(`LIVEKIT_API_KEY=devkey`, `LIVEKIT_API_SECRET=secret`). Ajuste se você
alterar o `docker-compose.yml`.

### 3. Frontend

Em outro terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev               # inicia em http://localhost:5173
```

### 4. Acesse

Abra `http://localhost:5173` no navegador.

## Testando com duas "pessoas" na mesma sala

1. Com os três serviços rodando (LiveKit, backend, frontend), abra
   `http://localhost:5173` em duas abas do navegador (ou uma aba normal +
   uma anônima, para evitar cache de permissões de câmera/microfone
   compartilhado).
2. O web é exclusivo do **especialista** — não há mais seletor de papel. Para
   testar dois participantes no navegador, abra duas abas e informe o **mesmo
   valor** no campo "Atendimento ou sala" (ex.: `atd-teste-001`); ambas entram
   como especialista. O fluxo real do médico solicitante é pelo app mobile.
3. Na **aba 1**: preencha nome (ex.: "Dra. Ana") e a sala. Clique em "Entrar
   na sala". Na **aba 2**: outro nome (ex.: "Dr. Bruno") e a mesma sala.
4. Autorize câmera/microfone em ambas as abas. Você deve ver os dois
   participantes na grade de vídeo, identificados pelo `nomeExibicao` do
   metadata (não pelo `identity`, que é um UUID opaco).
5. Envie mensagens pelo chat em uma aba e confirme que aparecem na outra
   (chat trafega via Data Channel do LiveKit, sem persistência — some ao
   recarregar a página).
6. Na aba de upload, envie um arquivo em uma aba; a lista da outra aba se
   atualiza automaticamente (polling a cada 5s) com um link de download.

## Endpoints do backend

| Método | Rota                                    | Descrição                                              |
|--------|------------------------------------------|----------------------------------------------------------|
| GET    | `/api/health`                            | Healthcheck; devolve também `authRequired`                |
| POST   | `/api/token`                             | Gera JWT para entrar na sala (identity opaco + metadata)  |
| POST   | `/api/rooms`                             | Cria/recupera a sala. Com `atendimentoId` é idempotente e devolve sempre o mesmo `roomName` |
| GET    | `/api/rooms/:roomId`                     | Dados da sala e seus arquivos                             |
| GET    | `/api/rooms/por-atendimento/:id`         | Resolve o `roomName` a partir do atendimento              |
| POST   | `/api/upload`                            | Upload multipart (`roomId`, `file`) em `/server/src/uploads/<roomId>/` |
| GET    | `/api/uploads/:roomId`                   | Lista arquivos enviados na sala                           |
| GET    | `/api/upload/limites`                    | Limites em bytes: `{ video, padrao }`                     |
| GET    | `/files/:roomId/:arquivo`                | Download direto do arquivo (estático)                     |

## Contrato com os clientes

- **`roomName` é gerado pelo servidor**, no formato `atd-` + UUID v4 sem hífens. É opaco,
  imutável por atendimento e validado por `^[a-z0-9-]{8,64}$` em todos os endpoints.
  Nenhum cliente inventa nome de sala. Ver `server/src/lib/roomName.ts`.
- **`identity` do participante é um UUID opaco.** O nome real trafega apenas no
  `metadata`, como `{ "role": "...", "nomeExibicao": "..." }`. Nunca exiba o `identity`
  na UI — o web faz isso em `client/src/lib/participants.ts`.
- **Autenticação** por Bearer da API principal, ligada por `AUTH_REQUIRED` no `.env`.
  Em dev fica `false` (token opcional); em qualquer ambiente com dado real de paciente
  precisa ser `true`, com `AUTH_VERIFY_URL` apontando para a API Nest.
- **Limites de upload**: 100 MB para `video/*`, 50 MB para os demais tipos.
- O cliente web atende **somente o especialista**. O médico solicitante usa o app mobile.

Detalhamento e pendências do lado da API Nest: [`RESPOSTA-CONTRATO-ROOMNAME.md`](./RESPOSTA-CONTRATO-ROOMNAME.md).
Contrato de integração do app: [`PROMPT-MOBILE-EXPO-LIVEKIT.md`](./PROMPT-MOBILE-EXPO-LIVEKIT.md).

## Notas

- O chat não persiste histórico em banco algum — é só sinalização em
  tempo real via Data Channel do LiveKit.
- Uploads são persistidos em disco (`server/src/uploads/<roomId>/`) e
  indexados no SQLite via Prisma; não há limpeza automática nesta PoC.
- `docker-compose.yml` expõe a faixa UDP `50000-50100` para WebRTC — em
  redes muito restritivas (VPN corporativa, firewall agressivo) pode ser
  necessário liberar essa faixa ou testar em rede local simples.

## Próximos passos

Assim que o design de referência (mockups) for enviado, o estilo visual
(cores, tipografia, layout das telas Join/Room) será ajustado nos
componentes do `/client` — a estrutura funcional acima já está pronta para
receber esse ajuste sem mudanças de arquitetura.
