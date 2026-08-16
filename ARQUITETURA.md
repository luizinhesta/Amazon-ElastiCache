# Arquitetura do Projeto - Login Personalizado com Amazon Cognito

## Visão Geral da Arquitetura

Esta aplicação implementa um sistema de autenticação customizado utilizando Amazon Cognito, sem depender da Hosted UI ou Managed Login. A arquitetura segue o modelo serverless da AWS, com frontend React hospedado em S3/CloudFront, autenticação gerenciada pelo Cognito User Pool, e backend composto por API Gateway REST com Lambda monolítica.

A comunicação entre os componentes é feita via HTTPS, com tokens JWT (ID Token) emitidos pelo Cognito sendo utilizados para autorizar requisições à API.

---

## Componentes do Sistema

### Aplicação Frontend (React + TypeScript + Vite)

Aplicação single-page (SPA) construída com React 18, TypeScript e Vite como bundler. Responsável por toda a interface do usuário, incluindo telas de login, registro, confirmação de email, recuperação de senha, área autenticada e perfil. Utiliza CSS Modules para estilização com escopo local e React Router v6 para navegação client-side.

- **Build tool:** Vite (desenvolvimento rápido com HMR)
- **Linguagem:** TypeScript (tipagem estática)
- **Roteamento:** React Router v6 (rotas públicas e privadas)
- **Estado global:** React Context + useReducer (estado de autenticação)

### Serviço de Autenticação (AWS Amplify Auth v6)

Módulo que encapsula a comunicação com o Cognito User Pool utilizando a biblioteca oficial AWS Amplify Auth (v6). Gerencia automaticamente o armazenamento e renovação de tokens JWT, abstrai as chamadas SRP (Secure Remote Password) e expõe uma API simplificada para operações de autenticação.

- **Protocolo:** SRP (Secure Remote Password)
- **Tokens gerenciados:** ID Token, Access Token, Refresh Token
- **Armazenamento:** Mecanismo padrão do Amplify (sem acesso manual a cookies/localStorage)

### API Gateway REST (Regional, us-east-1)

API Gateway do tipo REST API, implantada como Regional na região us-east-1. Expõe endpoints para o backend e utiliza Cognito User Pool Authorizer para validar tokens JWT nas rotas protegidas. Configurada com integração Lambda Proxy e suporte a CORS.

- **Tipo:** REST API (Regional)
- **Stage:** dev
- **Autorização:** Cognito User Pool Authorizer
- **Integração:** Lambda Proxy (evento completo repassado à Lambda)
- **CORS:** Configurado para localhost:5173 e domínio CloudFront

### Função Lambda (Node.js + TypeScript, monolítica)

Função AWS Lambda única que processa todas as rotas da API. Implementada em Node.js com TypeScript, utiliza roteamento interno baseado no método HTTP e path do evento. Segue o princípio do menor privilégio nas permissões IAM.

- **Runtime:** Node.js (TypeScript compilado)
- **Padrão:** Monolítica (uma Lambda para todos os endpoints)
- **Endpoints:** GET /health, GET /me, GET /game/status
- **Segurança:** Logs sanitizados (sem dados sensíveis), respostas de erro genéricas

### Cognito User Pool (Gerenciamento de Usuários)

Serviço AWS que gerencia o ciclo de vida dos usuários: registro, verificação de email, autenticação, recuperação de senha e gerenciamento de atributos. Configurado com email como alias de login e política de senha rigorosa.

- **Região:** us-east-1
- **Login:** Email como alias
- **Verificação:** Código numérico por email
- **Atributos:** name, email, preferred_username
- **Política de senha:** Mínimo 8 caracteres, maiúscula, minúscula, número e caractere especial
- **App Client:** Sem client secret, fluxos ALLOW_USER_SRP_AUTH e ALLOW_REFRESH_TOKEN_AUTH

### Bucket S3 (Hospedagem Estática Privada)

Bucket S3 com todo acesso público bloqueado ("Block all public access"). Armazena os arquivos estáticos do frontend (HTML, CSS, JS, assets). Acessível exclusivamente através da distribuição CloudFront via Origin Access Control (OAC).

- **Acesso público:** Totalmente bloqueado
- **Bucket Policy:** Permite acesso apenas da distribuição CloudFront
- **Conteúdo:** Build de produção do Vite (dist/)

### Distribuição CloudFront (HTTPS, OAC)

CDN da AWS que serve o frontend via HTTPS com baixa latência. Utiliza Origin Access Control para acessar o bucket S3 de forma segura. Configurada com Custom Error Response para suportar roteamento client-side do React (SPA).

- **Protocolo:** Redirect HTTP to HTTPS
- **Acesso ao S3:** Origin Access Control (OAC)
- **Default Root Object:** index.html
- **Custom Error Response:** 403/404 → index.html (status 200) para suportar React Router
- **Domínio:** URL padrão do CloudFront (domínio customizado opcional)

---

## Diagrama de Arquitetura

```mermaid
graph TB
    subgraph "Cliente"
        Browser[Navegador]
    end
    subgraph "AWS - Frontend Hosting"
        CF[CloudFront Distribution]
        S3[S3 Bucket Privado]
    end
    subgraph "AWS - Autenticação"
        Cognito[Cognito User Pool]
        AppClient[App Client - sem secret]
    end
    subgraph "AWS - Backend"
        APIGW[API Gateway REST - Regional]
        Authorizer[Cognito User Pool Authorizer]
        Lambda[Lambda Function - Node.js/TS]
    end
    Browser -->|HTTPS| CF
    CF -->|OAC| S3
    Browser -->|Amplify Auth SDK| Cognito
    Cognito --- AppClient
    Browser -->|REST + JWT| APIGW
    APIGW --> Authorizer
    Authorizer -->|Valida Token| Cognito
    APIGW -->|Lambda Proxy| Lambda
```

### Descrição das Conexões

| Origem | Destino | Protocolo/Mecanismo | Descrição |
|--------|---------|---------------------|-----------|
| Navegador | CloudFront | HTTPS | Acesso à aplicação frontend |
| CloudFront | S3 | OAC (Origin Access Control) | Busca dos arquivos estáticos |
| Navegador | Cognito | Amplify Auth SDK (HTTPS) | Operações de autenticação (SRP) |
| Cognito | App Client | Interno | Configuração do cliente de aplicação |
| Navegador | API Gateway | REST + JWT (HTTPS) | Chamadas à API com token de autorização |
| API Gateway | Authorizer | Interno | Validação do token JWT |
| Authorizer | Cognito | Interno | Verificação de assinatura e expiração do token |
| API Gateway | Lambda | Lambda Proxy | Repasse do evento completo para processamento |

---

## Fluxo de Autenticação

O fluxo de autenticação utiliza o protocolo SRP (Secure Remote Password), que permite autenticar o usuário sem transmitir a senha em texto plano pela rede. O Amplify Auth abstrai toda a complexidade do SRP, expondo uma API simples de `signIn`.

### Etapas do Fluxo de Login

1. **Submissão de credenciais:** O usuário informa email e senha no formulário de login
2. **Chamada ao Amplify:** O frontend invoca `signIn(email, password)` do Amplify Auth
3. **Negociação SRP:** O Amplify executa o protocolo SRP com o Cognito (InitiateAuth + RespondToAuthChallenge)
4. **Emissão de tokens:** O Cognito retorna três tokens: ID Token, Access Token e Refresh Token
5. **Armazenamento de sessão:** O Amplify armazena os tokens de forma segura e retorna a sessão
6. **Redirecionamento:** O frontend redireciona o usuário para a área autenticada
7. **Chamada à API:** O frontend faz requisições à API incluindo o ID Token no header Authorization
8. **Validação:** O Cognito Authorizer da API Gateway valida a assinatura e expiração do token
9. **Processamento:** A Lambda recebe o evento com os claims do usuário e retorna os dados

### Diagrama de Sequência - Login

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend (React)
    participant A as Amplify Auth
    participant C as Cognito User Pool
    participant API as API Gateway
    participant L as Lambda
    U->>F: Submete credenciais
    F->>A: signIn(email, password)
    A->>C: InitiateAuth (SRP)
    C-->>A: Tokens (ID, Access, Refresh)
    A-->>F: AuthSession
    F->>F: Redireciona para área autenticada
    F->>API: GET /me (Authorization: Bearer ID_Token)
    API->>C: Valida Token JWT
    C-->>API: Token válido
    API->>L: Evento Lambda Proxy
    L-->>API: Dados do usuário
    API-->>F: JSON response
```

### Tokens JWT

| Token | Finalidade | Tempo de Vida |
|-------|-----------|---------------|
| ID Token | Identifica o usuário (claims: sub, email, name, preferred_username) | 1 hora (padrão Cognito) |
| Access Token | Autoriza operações no User Pool | 1 hora (padrão Cognito) |
| Refresh Token | Obtém novos tokens sem re-autenticação | 30 dias (padrão Cognito) |

---

## Decisões de Design

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Framework Frontend | React 18 + TypeScript + Vite | Performance de build com HMR, tipagem estática para segurança, ecossistema maduro com ampla comunidade |
| Biblioteca de Autenticação | AWS Amplify Auth v6 | Abstração oficial da AWS para Cognito, gerenciamento automático de tokens e renovação, suporte nativo a SRP |
| Roteamento | React Router v6 | Padrão de mercado para SPAs React, suporte robusto a rotas protegidas, lazy loading e navegação programática |
| Estilização | CSS Modules | Escopo local automático (evita conflitos), sem overhead de runtime (diferente de CSS-in-JS), compatibilidade nativa com Vite |
| Estado de Autenticação | React Context + useReducer | Simplicidade sem dependências externas (Redux não necessário), suficiente para estado global de autenticação |
| Backend | Lambda única (monolítica) | Simplicidade para apenas 3 endpoints, cold start compartilhado, deploy atômico, facilita manutenção neste estágio do projeto |
| Tipo de API | API Gateway REST (Regional) | Suporte nativo a Cognito User Pool Authorizer (sem código adicional), deploy por stages (dev/prod), integração direta com Lambda Proxy |
| Hospedagem Frontend | S3 privado + CloudFront + OAC | Segurança (sem acesso público direto ao bucket), HTTPS obrigatório, distribuição global com baixa latência, custo reduzido para conteúdo estático |

---

## Fluxo de Registro

O registro de um novo usuário segue um fluxo em duas etapas: criação da conta e confirmação do email via código de verificação.

### Etapas do Fluxo de Registro

1. **Preenchimento do formulário:** O usuário informa nome completo, apelido, email e senha
2. **Validação local:** O frontend valida formato do email, complexidade da senha e match das senhas
3. **Criação da conta:** O Amplify invoca `signUp` no Cognito com os atributos do usuário
4. **Envio do código:** O Cognito envia um código de verificação de 6 dígitos para o email informado
5. **Redirecionamento:** O frontend redireciona para a tela de confirmação de código
6. **Inserção do código:** O usuário digita o código recebido por email
7. **Confirmação:** O Amplify invoca `confirmSignUp` no Cognito para validar o código
8. **Ativação:** A conta é ativada e o usuário é redirecionado para o login com mensagem de sucesso

### Diagrama de Sequência - Registro

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend (React)
    participant A as Amplify Auth
    participant C as Cognito User Pool

    U->>F: Preenche formulário de registro
    F->>F: Validação local (email, senha, campos)
    F->>A: signUp(email, password, attributes)
    A->>C: SignUp (name, email, preferred_username)
    C-->>C: Envia código de verificação por email
    C-->>A: Sucesso - aguarda confirmação
    A-->>F: Registro pendente de confirmação
    F->>F: Redireciona para tela de confirmação
    U->>F: Insere código de 6 dígitos
    F->>A: confirmSignUp(email, code)
    A->>C: ConfirmSignUp
    C-->>A: Conta confirmada
    A-->>F: Sucesso
    F->>F: Redireciona para login com mensagem de sucesso
```

### Reenvio de Código

Caso o usuário não receba ou perca o código de verificação, a tela de confirmação oferece a opção "Reenviar código", que solicita ao Cognito o envio de um novo código para o email cadastrado.

---

## Estrutura de Diretórios

```
AWS-Cognito/
├── src/                          # Código-fonte do frontend
│   ├── components/               # Componentes reutilizáveis
│   │   ├── LoadingSpinner/       # Indicador de carregamento
│   │   ├── PasswordInput/        # Input com toggle de visibilidade
│   │   ├── PrivateRoute/         # Wrapper para rotas protegidas
│   │   ├── PublicRoute/          # Redirect para usuários autenticados
│   │   └── ErrorMessage/         # Exibição padronizada de erros
│   ├── pages/                    # Páginas da aplicação
│   │   ├── HomePage/             # Página inicial (tema dinossauro)
│   │   ├── LoginPage/            # Tela de login
│   │   ├── RegisterPage/         # Tela de registro
│   │   ├── ConfirmEmailPage/     # Confirmação de código
│   │   ├── ForgotPasswordPage/   # Recuperação de senha
│   │   ├── DashboardPage/        # Área autenticada
│   │   └── ProfilePage/          # Perfil do usuário
│   ├── routes/                   # Configuração de rotas
│   ├── services/                 # Serviços (auth, API)
│   ├── contexts/                 # React Contexts
│   ├── hooks/                    # Custom hooks
│   ├── utils/                    # Utilitários (validação, erros)
│   ├── styles/                   # Estilos globais
│   └── assets/                   # Imagens e assets
├── backend/                      # Código-fonte da Lambda
│   ├── src/
│   │   ├── index.ts              # Handler principal
│   │   ├── routes/               # Rotas (health, me, gameStatus)
│   │   ├── utils/                # Utilitários (CORS, response, logger)
│   │   └── types/                # Tipos TypeScript
│   ├── package.json
│   └── tsconfig.json
├── ARQUITETURA.md                # Este documento
├── IMPLANTACAO-AWS.md            # Guia de deploy na AWS
└── README.md                     # Documentação principal
```


---

# Projeto 2 — Dino Game + Amazon ElastiCache Serverless para Valkey

## Visão Geral

O Projeto 2 evolui a arquitetura do Projeto 1 adicionando um jogo estilo dinossauro do Chrome com sistema de ranking e sessões gerenciados por Amazon ElastiCache Serverless para Valkey. A Lambda passa a executar dentro de uma VPC com subnets privadas para acessar o cache de forma segura, mantendo toda a infraestrutura anterior (Cognito, CloudFront, S3, API Gateway) inalterada.

---

## Diagrama de Arquitetura da VPC

```mermaid
graph TB
    subgraph "AWS - VPC 10.20.0.0/16"
        subgraph "Subnet Privada A - 10.20.1.0/24"
            LambdaENI_A[Lambda ENI - AZ A]
        end
        subgraph "Subnet Privada B - 10.20.2.0/24"
            LambdaENI_B[Lambda ENI - AZ B]
        end
        subgraph "ElastiCache Subnet Group"
            ElastiCache[ElastiCache Serverless<br/>Valkey - porta 6379 TLS]
        end
        subgraph "Security Groups"
            SG_Lambda[SG Lambda<br/>Outbound: porta 6379]
            SG_Cache[SG ElastiCache<br/>Ingress: porta 6379<br/>Source: SG Lambda]
        end
    end

    subgraph "AWS - Backend"
        APIGW[API Gateway REST]
        Lambda[Lambda Function<br/>Node.js/TypeScript]
    end

    APIGW -->|Lambda Proxy| Lambda
    Lambda -->|ENI| LambdaENI_A
    Lambda -->|ENI| LambdaENI_B
    LambdaENI_A -->|TLS porta 6379| ElastiCache
    LambdaENI_B -->|TLS porta 6379| ElastiCache
    SG_Lambda -.->|Permite saída| SG_Cache
    SG_Cache -.->|Permite ingress| ElastiCache
```

### Detalhes da Rede

| Componente | CIDR / Configuração | Descrição |
|------------|---------------------|-----------|
| VPC | 10.20.0.0/16 | Virtual Private Cloud dedicada |
| Subnet Privada A | 10.20.1.0/24 | Subnet privada na AZ A (sem Internet Gateway) |
| Subnet Privada B | 10.20.2.0/24 | Subnet privada na AZ B (sem Internet Gateway) |
| Lambda Security Group | Outbound: porta 6379 para SG ElastiCache | Permite Lambda acessar o cache |
| ElastiCache Security Group | Ingress: porta 6379, source: SG Lambda | Restringe acesso ao cache apenas da Lambda |
| ElastiCache Serverless | Valkey, porta 6379, TLS obrigatório | Cache gerenciado sem nodes para provisionar |

---

## Diagrama de Fluxo de Dados

```mermaid
sequenceDiagram
    participant Browser as Navegador
    participant APIGW as API Gateway REST
    participant Auth as Cognito Authorizer
    participant Lambda as Lambda (VPC)
    participant Cache as ElastiCache Serverless<br/>Valkey

    Browser->>APIGW: POST /game/start (JWT)
    APIGW->>Auth: Valida token
    Auth-->>APIGW: Token válido (claims: sub, username)
    APIGW->>Lambda: Lambda Proxy Event
    Lambda->>Cache: HSET game:session:{sub} + EXPIRE 1800s
    Cache-->>Lambda: OK
    Lambda-->>APIGW: 200 {sessionId, status, expiresIn}
    APIGW-->>Browser: JSON Response

    Note over Browser: Jogador joga localmente (canvas)

    Browser->>APIGW: POST /game/score {score: 1500} (JWT)
    APIGW->>Auth: Valida token
    Auth-->>APIGW: Token válido
    APIGW->>Lambda: Lambda Proxy Event
    Lambda->>Cache: HGETALL game:session:{sub}
    Cache-->>Lambda: {status: "playing"}
    Lambda->>Cache: ZADD GT ranking:global score sub
    Cache-->>Lambda: OK
    Lambda->>Cache: HSET game:session:{sub} status=finished + EXPIRE 60s
    Cache-->>Lambda: OK
    Lambda-->>APIGW: 200 {recorded, newBest, bestScore, rankPosition}
    APIGW-->>Browser: JSON Response

    Browser->>APIGW: GET /game/ranking (JWT)
    APIGW->>Lambda: Lambda Proxy Event
    Lambda->>Cache: ZRANGE ranking:global 0 9 REV WITHSCORES
    Cache-->>Lambda: Top 10 com scores
    Lambda->>Cache: HGETALL player:{sub} × N
    Cache-->>Lambda: Usernames
    Lambda-->>APIGW: 200 [{position, username, score}]
    APIGW-->>Browser: JSON Response
```

---

## Novos Endpoints da API (Projeto 2)

| Método | Path | Autenticação | Descrição | Respostas |
|--------|------|--------------|-----------|-----------|
| POST | /game/start | Cognito JWT | Cria sessão de jogo no cache | 200: {sessionId, status, expiresIn} · 401: Não autorizado · 503: Cache indisponível |
| POST | /game/score | Cognito JWT | Registra pontuação e atualiza ranking | 200: {recorded, newBest, bestScore, rankPosition} · 400: Score inválido · 401: Não autorizado · 409: Sem sessão ativa · 503: Cache indisponível |
| GET | /game/ranking | Cognito JWT | Retorna top 10 jogadores | 200: [{position, username, score}] · 503: Cache indisponível |
| GET | /game/me | Cognito JWT | Retorna dados do jogador atual | 200: {username, bestScore, session} · 401: Não autorizado · 503: Cache indisponível |
| GET | /game/status | Cognito JWT | Verifica conectividade com o cache (atualizado) | 200: {game: "online"\|"offline", cache: "connected"\|"disconnected"} |

---

## Estruturas de Dados no Valkey (ElastiCache Serverless)

O ElastiCache Serverless para Valkey armazena três tipos de dados para o sistema de jogo:

### Sessão de Jogo

| Chave | Tipo Redis | Campos | TTL | Descrição |
|-------|-----------|--------|-----|-----------|
| `game:session:{sub}` | Hash | `status`: "playing" \| "finished"<br/>`score`: string numérico<br/>`startedAt`: ISO 8601 | 1800s (30 min) | Sessão ativa do jogador. Criada ao iniciar partida, expirada automaticamente ou encerrada ao registrar pontuação. |

**Operações:**
- `HSET game:session:{sub} status playing score 0 startedAt <ISO>` — Criar sessão
- `EXPIRE game:session:{sub} 1800` — Definir TTL
- `HGETALL game:session:{sub}` — Consultar sessão
- `HSET game:session:{sub} status finished score <valor>` — Encerrar sessão

### Ranking Global

| Chave | Tipo Redis | Membros/Scores | TTL | Descrição |
|-------|-----------|----------------|-----|-----------|
| `ranking:global` | Sorted Set | member = `{sub}` (Cognito User ID)<br/>score = pontuação máxima | Sem TTL | Ranking permanente com a melhor pontuação de cada jogador. Usa ZADD GT para aceitar apenas scores maiores. |

**Operações:**
- `ZADD GT ranking:global <score> <sub>` — Atualizar ranking (apenas se score for maior)
- `ZRANGE ranking:global 0 9 REV WITHSCORES` — Top 10 em ordem decrescente
- `ZSCORE ranking:global <sub>` — Melhor pontuação de um jogador
- `ZREVRANK ranking:global <sub>` — Posição de um jogador no ranking

### Dados do Jogador

| Chave | Tipo Redis | Campos | TTL | Descrição |
|-------|-----------|--------|-----|-----------|
| `player:{sub}` | Hash | `username`: string | Sem TTL | Mapeamento do sub do Cognito para o nome de exibição do jogador. Atualizado a cada início de partida. |

**Operações:**
- `HSET player:{sub} username <nome>` — Salvar/atualizar nome de exibição
- `HGETALL player:{sub}` — Consultar dados do jogador

### Diagrama de Relacionamento das Chaves

```mermaid
graph LR
    subgraph "Chaves por Jogador"
        Session["game:session:{sub}<br/>Hash - TTL 30min"]
        Player["player:{sub}<br/>Hash - Permanente"]
    end
    subgraph "Chave Global"
        Ranking["ranking:global<br/>Sorted Set - Permanente"]
    end

    Player -->|username usado em| Ranking
    Session -->|score final enviado para| Ranking
    Session -->|validada antes de| Ranking
```

---

## Decisões de Design — Projeto 2

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Cache Engine | ElastiCache Serverless para Valkey | Compatível com Redis, sem gerenciamento de nodes, escala automática, custo sob demanda |
| Rede | VPC com subnets privadas (sem Internet Gateway) | ElastiCache só é acessível de dentro da VPC, segurança por isolamento de rede |
| Conexão TLS | Porta 6379 com TLS obrigatório | ElastiCache Serverless para Valkey exige TLS em todas as conexões |
| Padrão de conexão | Singleton com reconnect strategy | Reutiliza conexão entre invocações quentes da Lambda, reduz latência |
| Atualização de ranking | ZADD GT (sem NX) | NX impediria atualizações; GT permite atualizar apenas quando o novo score é maior |
| Lógica do jogo | 100% local no browser (canvas) | Evita latência de rede durante gameplay; comunica apenas início e fim da partida |
| Lambda em VPC | ENIs em 2 subnets privadas | Alta disponibilidade (multi-AZ) e acesso direto ao ElastiCache |
| Security Groups | SG Lambda → SG Cache (porta 6379) | Princípio do menor privilégio; apenas a Lambda pode acessar o cache |
