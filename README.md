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
2. Na **aba 1**: preencha nome (ex.: "Dra. Ana"), papel "Médico
   solicitante" e sala "caso-123". Clique em "Entrar na sala".
3. Na **aba 2**: preencha outro nome (ex.: "Dr. Bruno"), papel
   "Especialista" e a **mesma sala** "caso-123". Clique em "Entrar na
   sala".
4. Autorize câmera/microfone em ambas as abas. Você deve ver os dois
   participantes na grade de vídeo.
5. Envie mensagens pelo chat em uma aba e confirme que aparecem na outra
   (chat trafega via Data Channel do LiveKit, sem persistência — some ao
   recarregar a página).
6. Na aba de upload, envie um arquivo em uma aba; a lista da outra aba se
   atualiza automaticamente (polling a cada 5s) com um link de download.

## Endpoints do backend

| Método | Rota                    | Descrição                                              |
|--------|--------------------------|----------------------------------------------------------|
| POST   | `/api/token`             | Gera JWT (via `livekit-server-sdk`) para entrar na sala  |
| POST   | `/api/rooms`              | Registra/garante uma sala pelo nome                       |
| POST   | `/api/upload`             | Upload multipart (`roomId`, `file`) salvo em `/server/src/uploads/<roomId>/` |
| GET    | `/api/uploads/:roomId`    | Lista arquivos enviados na sala                           |
| GET    | `/files/:roomId/:arquivo` | Download direto do arquivo (estático)                     |

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
