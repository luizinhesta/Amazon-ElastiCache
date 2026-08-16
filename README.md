# 🦕 Dino Login — Autenticação Customizada com Amazon Cognito

## Sobre o Projeto

Este projeto é o **Projeto 1** de uma série de laboratórios práticos com serviços AWS. O objetivo é construir uma aplicação web com sistema de login totalmente customizado utilizando **Amazon Cognito**, sem depender da Hosted UI ou Managed Login da AWS.

A aplicação permite que usuários se cadastrem, confirmem o email, façam login, recuperem senha e gerenciem seu perfil — tudo através de telas React personalizadas que se comunicam diretamente com o Cognito via AWS Amplify.

## Para que serve?

O Dino Login demonstra como implementar um fluxo completo de autenticação e autorização em uma aplicação web moderna utilizando serviços gerenciados da AWS. Isso inclui:

- Registro de usuários com validação de email
- Login seguro com protocolo SRP (Secure Remote Password)
- Recuperação e alteração de senha
- Proteção de rotas e endpoints com tokens JWT
- Gerenciamento de perfil do usuário

## O que aprendemos com este projeto?

- Como configurar e utilizar o **Amazon Cognito** para gerenciar usuários sem precisar de um banco de dados próprio
- Como construir um frontend React que se autentica diretamente com o Cognito via **AWS Amplify Auth v6**
- Como proteger endpoints de API com **Cognito User Pool Authorizer** no API Gateway
- Como hospedar uma aplicação estática de forma segura com **S3 + CloudFront + HTTPS**
- Como configurar **CORS** e comunicação segura entre frontend e backend
- Como usar **Lambda** como backend serverless
- Como configurar **domínio customizado com certificado SSL** (ACM + Route 53)

---

## Arquitetura AWS

### Visão geral

A aplicação segue uma arquitetura **serverless** na AWS, onde não é necessário gerenciar servidores. Todos os componentes são serviços gerenciados que escalam automaticamente.

```mermaid
graph TB
    subgraph "Cliente"
        Browser[Navegador do Usuário]
    end

    subgraph "AWS - Hospedagem Frontend"
        CF[CloudFront - CDN HTTPS]
        S3[S3 Bucket Privado]
    end

    subgraph "AWS - Autenticação"
        Cognito[Cognito User Pool]
    end

    subgraph "AWS - Backend"
        APIGW[API Gateway REST]
        Authorizer[Cognito Authorizer]
        Lambda[Lambda - Node.js]
    end

    Browser -->|HTTPS| CF
    CF -->|OAC| S3
    Browser -->|Amplify Auth| Cognito
    Browser -->|REST + JWT| APIGW
    APIGW --> Authorizer
    Authorizer -->|Valida Token| Cognito
    APIGW -->|Lambda Proxy| Lambda
```

### Acesso e DNS (HTTPS)

O acesso do usuário à aplicação funciona da seguinte forma:

1. O usuário acessa a URL (ex: `https://dino.dev.seudominio.com`)
2. O DNS (Route 53) resolve o domínio para a distribuição **CloudFront**
3. O CloudFront serve os arquivos estáticos do **S3** via HTTPS
4. O certificado SSL é gerenciado pelo **ACM** (AWS Certificate Manager)
5. O bucket S3 é **privado** — ninguém acessa diretamente, só o CloudFront via Origin Access Control (OAC)

Isso garante que toda a comunicação é criptografada e o conteúdo é entregue com baixa latência globalmente.

---

## Amazon Cognito — Como funciona a autenticação

O Amazon Cognito é o serviço que gerencia todo o ciclo de vida dos usuários: registro, verificação, login, tokens e recuperação de senha.

### Fluxo do cadastro e login

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend (React)
    participant A as Amplify Auth
    participant C as Cognito User Pool

    U->>F: Preenche formulário de registro
    F->>A: signUp(email, senha, atributos)
    A->>C: Cria usuário no pool
    C-->>U: Envia código de verificação por email
    U->>F: Insere código de 6 dígitos
    F->>A: confirmSignUp(email, código)
    A->>C: Confirma conta
    C-->>A: Conta ativada

    U->>F: Informa email + senha para login
    F->>A: signIn(email, senha)
    A->>C: Protocolo SRP (sem enviar senha em texto)
    C-->>A: Tokens JWT (ID, Access, Refresh)
    A-->>F: Sessão autenticada
    F->>F: Redireciona para área autenticada
```

### Como a API é protegida

Quando o usuário está logado e a aplicação chama a API:

1. O frontend pega o **ID Token** (JWT) da sessão do Cognito
2. Envia a requisição para o API Gateway com o header `Authorization: Bearer <token>`
3. O **Cognito Authorizer** no API Gateway valida automaticamente:
   - Se o token foi assinado pelo Cognito correto
   - Se o token não está expirado
4. Se válido, o API Gateway repassa a requisição para a Lambda com os **claims** do usuário (sub, email, name, preferred_username)
5. A Lambda retorna os dados do usuário sem precisar consultar banco de dados

---

## Aplicação Node.js — Como funciona o site

### Frontend (React + TypeScript + Vite)

O frontend é uma Single Page Application (SPA) construída com:

- **React 18** — interface de usuário com componentes reutilizáveis
- **TypeScript** — tipagem estática para maior segurança no código
- **Vite** — bundler rápido para desenvolvimento e build de produção
- **AWS Amplify Auth v6** — biblioteca oficial para comunicação com Cognito
- **React Router v6** — navegação entre páginas sem recarregar
- **CSS Modules** — estilização com escopo local (sem conflitos de CSS)

O frontend NÃO acessa banco de dados. Toda a autenticação é feita diretamente com o Cognito através do Amplify, e os dados do usuário vêm da API Gateway + Lambda.

### Backend (Lambda + TypeScript)

O backend é uma **única função Lambda** que processa todas as requisições da API. Funciona assim:

- Recebe o evento do API Gateway (método HTTP + path + headers)
- Roteia internamente: `/health`, `/me`, `/game/status`
- Para `/me`, extrai os claims do token JWT (já validado pelo Authorizer)
- Retorna resposta JSON com headers CORS

Não usa banco de dados — os dados do usuário vêm dos claims do JWT emitido pelo Cognito.

### Fluxo de processamento de uma requisição

```
Navegador → CloudFront → S3 (frontend estático)
                              ↓
                     Usuário interage
                              ↓
Navegador → API Gateway → Cognito Authorizer → Lambda → Resposta JSON
                              ↓
                     Valida JWT com Cognito
```

---

## Recursos AWS utilizados

| Recurso | Função |
|---------|--------|
| **Amazon Cognito** | Gerencia usuários, registro, login, tokens JWT, recuperação de senha |
| **AWS Lambda** | Backend serverless que processa as requisições da API |
| **API Gateway (REST)** | Expõe endpoints HTTP e valida tokens com Cognito Authorizer |
| **Amazon S3** | Armazena os arquivos estáticos do frontend (HTML, CSS, JS) |
| **Amazon CloudFront** | CDN que serve o frontend via HTTPS com baixa latência |
| **AWS Certificate Manager (ACM)** | Gerencia certificado SSL para HTTPS no domínio customizado |
| **Amazon Route 53** | DNS para resolver o domínio customizado para o CloudFront |
| **AWS IAM** | Permissões mínimas para a Lambda (princípio do menor privilégio) |

---

## Benefícios da arquitetura

| Benefício | Descrição |
|-----------|-----------|
| **Sem servidor para gerenciar** | Todos os componentes são serverless — sem EC2, sem patches, sem manutenção de SO |
| **Escalabilidade automática** | Cognito, Lambda e API Gateway escalam conforme a demanda sem configuração |
| **Custo sob demanda** | Paga apenas pelo que usa — ideal para projetos com tráfego variável |
| **Segurança integrada** | HTTPS obrigatório, tokens JWT com expiração, bucket privado, Origin Access Control |
| **Alta disponibilidade** | Serviços distribuídos em múltiplas zonas de disponibilidade automaticamente |
| **Separação de responsabilidades** | Frontend (S3/CloudFront) e backend (Lambda/API Gateway) são independentes |
| **Deploy simples** | Frontend: upload para S3. Backend: upload de ZIP para Lambda. Sem CI/CD complexo |
| **Sem banco de dados** | Os dados dos usuários ficam no Cognito. A Lambda é stateless |

---

## Estrutura de Diretórios

```
AWS-Cognito/
├── src/                          # Código-fonte do frontend (React)
│   ├── components/               # Componentes reutilizáveis da interface
│   │   ├── LoadingSpinner/       # Indicador de carregamento
│   │   ├── PasswordInput/        # Campo de senha com toggle de visibilidade
│   │   ├── PrivateRoute/         # Protege rotas que exigem login
│   │   ├── PublicRoute/          # Redireciona logados para o dashboard
│   │   └── ErrorMessage/         # Exibição padronizada de erros
│   ├── pages/                    # Páginas completas da aplicação
│   │   ├── HomePage/             # Página inicial (tema dinossauro)
│   │   ├── LoginPage/            # Tela de login
│   │   ├── RegisterPage/         # Tela de cadastro
│   │   ├── ConfirmEmailPage/     # Confirmação do código de email
│   │   ├── ForgotPasswordPage/   # Recuperação de senha (2 etapas)
│   │   ├── DashboardPage/        # Área autenticada principal
│   │   └── ProfilePage/          # Edição de perfil e senha
│   ├── routes/                   # Configuração de rotas (React Router)
│   │   └── AppRouter.tsx         # Define rotas públicas e privadas
│   ├── services/                 # Comunicação com serviços externos
│   │   ├── authService.ts        # Wrapper sobre Amplify Auth (signIn, signUp, etc.)
│   │   └── apiService.ts         # Cliente HTTP para API Gateway (com JWT)
│   ├── contexts/                 # Estado global da aplicação
│   │   └── AuthContext.tsx       # Gerencia estado de autenticação
│   ├── hooks/                    # Hooks customizados do React
│   │   ├── useAuth.ts            # Acessa o contexto de autenticação
│   │   └── useForm.ts            # Gerencia formulários com validação
│   ├── utils/                    # Funções utilitárias
│   │   ├── validators.ts         # Validação de email, senha, campos
│   │   └── errorMapper.ts        # Traduz erros do Cognito para português
│   ├── types/                    # Interfaces e tipos TypeScript
│   │   └── index.ts              # AuthState, UserProfile, etc.
│   ├── styles/                   # Estilos globais
│   │   └── global.css            # Variáveis CSS, reset, tema dinossauro
│   ├── App.tsx                   # Componente raiz (AuthProvider + Router)
│   └── main.tsx                  # Entry point (configura Amplify)
├── backend/                      # Código-fonte do backend (Lambda)
│   ├── src/
│   │   ├── index.ts              # Handler principal (roteamento)
│   │   ├── routes/               # Handlers de cada endpoint
│   │   │   ├── health.ts         # GET /health (público)
│   │   │   ├── me.ts             # GET /me (protegido - dados do usuário)
│   │   │   └── gameStatus.ts     # GET /game/status (protegido)
│   │   ├── utils/                # Utilitários do backend
│   │   │   ├── cors.ts           # Validação de origens CORS
│   │   │   ├── response.ts       # Builder de respostas Lambda Proxy
│   │   │   └── logger.ts         # Log seguro (mascara dados sensíveis)
│   │   └── types/
│   │       └── index.ts          # Tipos do backend
│   ├── package.json
│   └── tsconfig.json
├── dist/                         # Build do frontend (gerado por npm run build)
├── public/                       # Arquivos públicos do Vite
├── .env                          # Variáveis de ambiente (NÃO commitar)
├── .env.example                  # Template de variáveis (sem valores reais)
├── .gitignore                    # Ignora node_modules, .env, dist
├── index.html                    # HTML principal do Vite
├── package.json                  # Dependências do frontend
├── vite.config.ts                # Configuração do Vite (build/dev)
├── vitest.config.ts              # Configuração do Vitest (testes)
├── README.md                     # Este arquivo
├── ARQUITETURA.md                # Detalhes técnicos e diagramas
└── IMPLANTACAO-AWS.md            # Guia passo a passo de implantação na AWS
```

---

## Documentação Adicional

- [IMPLANTACAO-AWS.md](./IMPLANTACAO-AWS.md) — Guia completo de implantação na AWS (Cognito, Lambda, API Gateway, S3, CloudFront, domínio customizado)
- [ARQUITETURA.md](./ARQUITETURA.md) — Detalhes técnicos, decisões de design e diagramas de sequência


---

# 🎮 Projeto 2 — Dino Game + Amazon ElastiCache

## Sobre o Projeto 2

O Projeto 2 adiciona um **jogo estilo dinossauro do Chrome** à aplicação existente, integrado com **Amazon ElastiCache Serverless para Valkey** como camada de cache. O jogo funciona inteiramente no navegador (canvas HTML5), enquanto o backend gerencia sessões de jogo, ranking global e dados do jogador usando um cache de alta performance em VPC privada.

Este projeto evolui a arquitetura do Projeto 1, mantendo toda a autenticação com Cognito e adicionando novos endpoints de API protegidos para a funcionalidade do jogo.

## Como o jogo funciona

- **Motor do jogo**: Renderizado em um elemento `<canvas>` HTML5, com game loop usando `requestAnimationFrame`
- **Mecânica**: O jogador controla um dinossauro que deve pular (tecla Espaço ou toque na tela) para desviar de obstáculos (cactos) que se aproximam da direita para a esquerda
- **Progressão**: A velocidade dos obstáculos aumenta gradualmente ao longo do tempo, tornando o jogo progressivamente mais difícil
- **Pontuação**: Calculada com base no número de frames sobrevividos — quanto mais tempo o jogador resistir, maior a pontuação
- **Colisão**: Detecção de colisão por sobreposição de retângulos (hitbox do dinossauro vs. hitbox dos obstáculos)
- **Game over**: A partida termina quando o dinossauro colide com um obstáculo; a pontuação é enviada automaticamente ao backend

A lógica do jogo é 100% local no navegador, sem dependência de rede durante o gameplay. A comunicação com o backend acontece apenas no início e no fim de cada partida.

## Integração com ElastiCache Serverless para Valkey

O Amazon ElastiCache Serverless para Valkey é utilizado como cache para:

| Funcionalidade | Estrutura no Valkey | Descrição |
|----------------|---------------------|-----------|
| **Sessões de jogo** | Hash (`game:session:{sub}`) | Armazena status da partida, pontuação e timestamp de início. TTL de 30 minutos. |
| **Ranking global** | Sorted Set (`ranking:global`) | Mantém as melhores pontuações de todos os jogadores, ordenadas automaticamente. Usa `ZADD GT` para atualizar apenas quando a nova pontuação é maior. |
| **Dados do jogador** | Hash (`player:{sub}`) | Mapeia o identificador do usuário (sub do Cognito) para seu nome de exibição. |

A conexão entre Lambda e ElastiCache é feita via TLS na porta 6379, dentro de uma VPC com subnets privadas, garantindo que o cache não é acessível pela internet.

## Novos endpoints de API

Todos os endpoints requerem autenticação (token JWT do Cognito no header `Authorization`).

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/game/start` | Inicia uma nova sessão de jogo. Retorna `sessionId`, `status` e `expiresIn`. |
| `POST` | `/game/score` | Registra a pontuação final da partida. Atualiza o ranking se for novo recorde. Retorna `recorded`, `newBest`, `bestScore` e `rankPosition`. |
| `GET` | `/game/ranking` | Retorna o top 10 jogadores com `position`, `username` e `score`. |
| `GET` | `/game/me` | Retorna informações do jogador atual: `username`, `bestScore` e `session` (se houver partida ativa). |
| `GET` | `/game/status` | Verifica disponibilidade do serviço de jogo e conectividade com o cache. Retorna `game` (online/offline) e `cache` (connected/disconnected). |

## Como executar localmente

### Frontend (funciona sem AWS)

O frontend pode ser executado localmente para desenvolvimento e testes da interface:

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

O jogo em si (motor canvas) funciona 100% localmente. As chamadas à API falharão sem o backend configurado, mas é possível testar a mecânica do jogo, a interface de ranking e a navegação.

### Backend (requer AWS)

O backend depende de uma instância do ElastiCache Serverless para Valkey rodando na AWS, pois:

- O ElastiCache Serverless **não possui emulador local** oficial
- A conexão requer VPC com subnets privadas e Security Groups configurados
- A Lambda precisa estar configurada com acesso à VPC para alcançar o cache

Para desenvolvimento do backend:

```bash
cd backend
npm install
npm run build    # Compila TypeScript
npm run test     # Executa testes unitários
```

> **Nota:** Para testar a integração completa (frontend + backend + cache), é necessário ter a infraestrutura AWS do Projeto 1 implantada, além dos recursos adicionais do Projeto 2 (VPC, ElastiCache, Security Groups). Consulte o [IMPLANTACAO-AWS.md](./IMPLANTACAO-AWS.md) para o guia completo de implantação.

## Recursos AWS adicionais (Projeto 2)

| Recurso | Função |
|---------|--------|
| **Amazon ElastiCache Serverless (Valkey)** | Cache de alta performance para sessões de jogo, ranking e dados do jogador |
| **VPC com subnets privadas** | Isolamento de rede para o ElastiCache (não acessível pela internet) |
| **Security Groups** | Controle de acesso: apenas a Lambda pode conectar ao cache na porta 6379 |
| **VPC Endpoint (CloudWatch Logs)** | Permite que a Lambda em VPC envie logs sem acesso à internet |

## Documentação Adicional

- [IMPLANTACAO-AWS.md](./IMPLANTACAO-AWS.md) — Guia de implantação incluindo os passos do Projeto 2 (VPC, ElastiCache, Security Groups)
- [ARQUITETURA.md](./ARQUITETURA.md) — Diagramas e detalhes técnicos da arquitetura completa (Projetos 1 e 2)
