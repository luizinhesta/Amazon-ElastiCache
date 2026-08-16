# Guia de Implantação AWS

Guia passo a passo para configuração manual dos serviços AWS necessários para a aplicação de login customizado com Cognito.

## Pré-requisitos

- Conta AWS ativa com permissões de administrador (ou permissões para criar recursos em Cognito, Lambda, API Gateway, S3, CloudFront, IAM)
- Familiaridade básica com o Console AWS
- [Node.js](https://nodejs.org/) 20.x ou superior instalado localmente (para build do projeto)
- AWS CLI configurada (opcional, para upload via terminal)

### Instalar Node.js (Windows)

O Node.js é necessário para compilar o código do frontend e do backend antes de enviar para a AWS.

1. Acesse [https://nodejs.org/](https://nodejs.org/)
2. Baixe a versão **LTS** (recomendada para a maioria dos usuários)
3. Execute o instalador e siga os passos (aceite as opções padrão)
4. Após a instalação, **feche e abra novamente** o PowerShell/Terminal
5. Verifique a instalação executando:
   ```powershell
   node --version
   npm --version
   ```
   - Ambos os comandos devem retornar um número de versão (ex: `v20.x.x` e `10.x.x`)

> **⚠️ Importante:** Se o comando `npm` não for reconhecido após a instalação, reinicie o computador para que as variáveis de ambiente sejam atualizadas.

---

## Etapa 1: Criar Cognito User Pool

1. Acesse o Console AWS e navegue para **Amazon Cognito** na região **us-east-1** (Leste dos EUA - Virgínia do Norte)
2. No menu lateral, clique em **Grupos de usuários**
3. Clique em **Criar grupo de usuários**

### Definir a aplicação

4. Em **Tipo de aplicação**, selecione **Aplicação de página única (SPA)**
5. Em **Dê um nome para sua aplicação**, insira: `dino-login-app`

> **Nome sugerido:** `dino-login-app`
> (este nome será usado tanto para o grupo de usuários quanto para o cliente da aplicação)

### Configurar opções

6. Em **Opções para identificadores de login**, marque apenas **E-mail**
   - Desmarque "Número de telefone" e "Nome de usuário" se estiverem marcados
7. Em **Autorregistro**, marque **Habilitar autorregistro**
8. Em **Atributos obrigatórios para a inscrição**, clique no dropdown **Selecionar atributos** e adicione:
   - **name**
   - **preferred_username**
   - (o **email** já é incluído automaticamente por ser o identificador de login)

### Adicionar um URL de retorno

9. Em **URL de retorno**, insira: `http://localhost:5173`
   - (Essa URL é usada pela Hosted UI/Login gerenciado. Para nosso caso com login customizado ela não será utilizada diretamente, mas o campo é obrigatório para concluir a criação)

### Concluir criação

10. Role até o final e clique em **Criar**
11. Aguarde a criação do grupo de usuários e do cliente de aplicação
12. Você será redirecionado para a página **Visão geral** do grupo de usuários criado

---

### Configurar a política de senha

Após a criação, ajuste a política de senha no menu lateral:

13. No menu lateral esquerdo, em **Autenticação**, clique em **Métodos de autenticação**
14. Role até a seção **Política de senha** e clique em **Editar**
15. Em **Modo de política de senha**, selecione **Personalizada**
16. Configure:
    - **Tamanho mínimo da senha**: 8 caractere(s)
    - Em **Requisitos de senhas**, marque:
      - **Contém pelo menos 1 número**
      - **Contém pelo menos um caractere especial**
      - **Contém pelo menos 1 letra maiúscula**
      - **Contém pelo menos 1 letra minúscula**
    - **As senhas temporárias definidas pelos administradores expiram em**: 7 dia(s) (manter padrão)
17. Clique em **Salvar alterações**

### Configurar fluxos de autenticação do cliente de aplicação

18. No menu lateral esquerdo, em **Aplicações**, clique em **Clientes da aplicação**
19. Clique no cliente de aplicação criado (`dino-login-app`)
20. Na seção **Informações do cliente de aplicação**, clique em **Editar**
21. Em **Nome do cliente de aplicação**, confirme que está como `dino-login-app`
22. Em **Fluxos de autenticação**, marque:
    - **Fazer login com senha remota segura (SRP): ALLOW_USER_SRP_AUTH**
    - **Obter novos tokens de usuário de sessões autenticadas existentes: ALLOW_REFRESH_TOKEN_AUTH**
    - (os demais fluxos podem ficar desmarcados)
23. Em **Configurações avançadas de segurança**:
    - Marque **Habilitar revogação do token**
    - Marque **Impedir erros de existência de usuário** (retorna resposta genérica de falha para não revelar se um email está cadastrado)
24. Clique em **Salvar alterações**

### Verificar métodos de autenticação

25. No menu lateral esquerdo, em **Autenticação**, clique em **Métodos de autenticação**
26. Confirme que a autenticação baseada em escolha está configurada com **E-mail + Senha (SRP)**

### Informações importantes para anotar

Na página **Visão geral** do grupo de usuários (acessível pelo menu lateral), anote:

- **Nome do grupo de usuários**: `dino-login-app`
- **ID do grupo de usuários** (formato: `us-east-1_XXXXXXXXX`) — campo "ID do grupo de usuários" na seção "Informações do grupo de usuários"
- **ID do cliente de aplicação** — em **Aplicações** > **Clientes da aplicação**, clique no app e copie o "ID do cliente"

---

## Etapa 2: Criar Função Lambda

### Preparar o código

1. Abra o PowerShell e navegue até a pasta `backend/` do projeto:
   ```powershell
   cd C:\github\AWS-Cognito\backend
   npm install
   npm run build
   ```
2. Ainda na pasta `backend/`, crie um arquivo ZIP com o conteúdo da pasta `dist/`:
   ```powershell
   Compress-Archive -Path C:\github\AWS-Cognito\backend\dist\* -DestinationPath C:\github\AWS-Cognito\backend\lambda-function.zip -Force
   ```
   > **Importante:** Execute este comando a partir da pasta `backend/`, **NÃO** de dentro da pasta `dist/`. O `-Force` sobrescreve se o arquivo já existir.

### Criar a função no Console AWS

3. Navegue para **AWS Lambda** na região **us-east-1**
4. Clique em **Criar função**
5. Selecione **Criar do zero**
6. Configure:
   - **Nome da função**: `dino-login-api`
   - **Runtime**: **Node.js 20.x**
   - **Arquitetura**: x86_64
7. Em **Permissões**, mantenha **Criar uma nova função com permissões básicas do Lambda**
8. Clique em **Criar função**

> **Nome sugerido para a função:** `dino-login-api`

### Fazer upload do código

9. Na página da função, em **Origem do código**, clique em **Fazer upload de** > **Arquivo .zip**
10. Faça upload do arquivo `lambda-function.zip` criado anteriormente
11. Clique em **Salvar**

### Configurar handler

12. Em **Configurações de runtime**, clique em **Editar**
13. Altere o **Manipulador** para: `index.handler`
14. Clique em **Salvar**

### Configurar variáveis de ambiente

15. Vá para a aba **Configuração** > **Variáveis de ambiente**
16. Clique em **Editar** e adicione:
    - **Chave**: `ALLOWED_ORIGINS`
    - **Valor**: `http://localhost:5173` (adicione a URL do CloudFront após criá-lo, separada por vírgula)
17. Clique em **Salvar**

### Configurar timeout (opcional)

18. Em **Configuração** > **Configuração geral**, clique em **Editar**
19. Ajuste o **Tempo limite** para **10 segundos** (suficiente para a aplicação)
20. Clique em **Salvar**

---

## Etapa 3: Configurar API Gateway

### Criar a API

1. Navegue para **API Gateway** na região **us-east-1**
2. Clique em **Criar API**
3. Em **API REST**, clique em **Compilar**
4. Configure:
   - **Nome da API**: `dino-login-api`
   - **Tipo de endpoint da API**: **Regional**
5. Clique em **Criar API**

> **Nome sugerido para a API:** `dino-login-api`

### Criar Autorizador do Cognito

6. No menu lateral, clique em **Autorizadores**
7. Clique em **Criar autorizador**
8. Configure:
   - **Nome do autorizador**: `dino-login-cognito-authorizer`
   - **Tipo de autorizador**: **Cognito**
   - **Grupo de usuários do Cognito**: selecione a região `us-east-1` e busque `dino-login-app`
   - **Origem do token**: digite `Authorization` após o prefixo `method.request.header.` que já aparece pré-preenchido (ficando `method.request.header.Authorization`)
   - **Validação de token - opcional**: deixe em branco
9. Clique em **Criar autorizador**

> **⚠️ Atenção:** No campo "Origem do token", o Console pré-preenche com `method.request.header.` — você deve digitar APENAS `Authorization` após esse prefixo. Não deixe o ponto final solto, senão dará erro.

### Criar recurso /health

10. No menu lateral, clique em **Recursos**
11. Clique em **Criar recurso**
12. Em **Caminho do recurso**, mantenha `/` e em **Nome do recurso**, insira `health`
13. Marque **Habilitar CORS do API Gateway**
14. Clique em **Criar recurso**

> Nome sugerido para o recurso: `health`

### Criar método GET para /health

15. Com o recurso `/health` selecionado, clique em **Criar método**
16. Configure:
    - **Tipo de método**: **GET**
    - **Tipo de integração**: **Função Lambda**
    - Marque **Integração de proxy Lambda**
    - **Função Lambda**: selecione `dino-login-api`
17. Clique em **Criar método**

### Criar recurso /me

18. Volte para o recurso raiz `/` e clique em **Criar recurso**
19. Em **Nome do recurso**, insira `me`
20. Marque **Habilitar CORS do API Gateway**
21. Clique em **Criar recurso**

> Nome sugerido para o recurso: `me`

### Criar método GET para /me (com Autorizador)

22. Com o recurso `/me` selecionado, clique em **Criar método**
23. Configure:
    - **Tipo de método**: **GET**
    - **Tipo de integração**: **Função Lambda**
    - Marque **Integração de proxy Lambda**
    - **Função Lambda**: selecione `dino-login-api`
24. Em **Configurações de solicitação de método**:
    - **Autorização**: selecione **dino-login-cognito-authorizer**
25. Clique em **Criar método**

### Criar recurso /game

26. Volte para o recurso raiz `/` e clique em **Criar recurso**
27. Em **Nome do recurso**, insira `game`
28. Clique em **Criar recurso**

> Nome sugerido para o recurso: `game`

### Criar recurso /game/status

29. Com o recurso `/game` selecionado, clique em **Criar recurso**
30. Em **Nome do recurso**, insira `status`
31. Marque **Habilitar CORS do API Gateway**
32. Clique em **Criar recurso**

> Nome sugerido para o recurso: `status` (ficará como `/game/status`)

### Criar método GET para /game/status (com Autorizador)

33. Com o recurso `/game/status` selecionado, clique em **Criar método**
34. Configure:
    - **Tipo de método**: **GET**
    - **Tipo de integração**: **Função Lambda**
    - Marque **Integração de proxy Lambda**
    - **Função Lambda**: selecione `dino-login-api`
35. Em **Configurações de solicitação de método**:
    - **Autorização**: selecione **dino-login-cognito-authorizer**
36. Clique em **Criar método**

### Habilitar CORS

> **Nota:** Se você marcou "Habilitar CORS do API Gateway" ao criar os recursos, os métodos OPTIONS já foram criados automaticamente. Caso contrário, siga os passos abaixo para cada recurso.

37. Para cada recurso (`/health`, `/me`, `/game/status`), caso o CORS não tenha sido configurado automaticamente:
    - Selecione o recurso
    - Clique em **Habilitar CORS**
    - Em **Access-Control-Allow-Headers**: `Authorization,Content-Type`
    - Em **Access-Control-Allow-Methods**: `GET,OPTIONS`
    - Em **Access-Control-Allow-Origin**: `*` (a Lambda gerencia origens específicas)
    - Clique em **Salvar**

### Implantar a API

38. Clique em **Implantar API**
39. Em **Estágio**, selecione **Novo estágio**
40. Em **Nome do estágio**, insira `dev`
41. Clique em **Implantar**

### Anotar URL da API

42. Após a implantação, anote a **URL de invocação** exibida (formato: `https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev`)
    - Esta URL será usada na variável de ambiente `VITE_API_URL` do frontend

---

## Etapa 4: Criar Bucket S3

### Criar o bucket

1. Navegue para **Amazon S3**
2. Clique em **Criar bucket**
3. Configure:
   - **Nome do bucket**: `dino-login-frontend-<SEU-ID>` (substitua `<SEU-ID>` por algo único, ex: seu ID de conta ou iniciais + data)
   - **Região da AWS**: **Leste dos EUA (Norte da Virgínia) us-east-1**
4. Em **Configurações de bloqueio de acesso público para este bucket**:
   - Marque **Bloquear todo o acesso público** (mantenha todas as opções marcadas)
5. Mantenha as demais configurações padrão
6. Clique em **Criar bucket**

> **Nome sugerido para o bucket:** `dino-login-frontend-<SEU-ID>` (o nome precisa ser globalmente único no S3)

> **Importante:** O bucket deve permanecer privado. O acesso público é feito exclusivamente via CloudFront com Controle de Acesso de Origem.

---

## Etapa 5: Configurar CloudFront

### Criar distribuição

1. Navegue para **Amazon CloudFront**
2. Clique em **Criar distribuição**

### Configurar origem

3. Em **Domínio de origem**, selecione o bucket S3 criado na Etapa 4
4. Em **Acesso à origem**:
   - Selecione **Configurações de controle de acesso de origem (recomendado)**
   - Clique em **Criar novo OAC**
   - Mantenha as configurações padrão e clique em **Criar**

### Configurar comportamento padrão

5. Em **Política de protocolo do visualizador**, selecione **Redirecionar HTTP para HTTPS**
6. Em **Métodos HTTP permitidos**, selecione **GET, HEAD**
7. Em **Política de cache**, selecione **CachingOptimized** (ou mantenha o padrão)

### Configurações gerais

8. Em **Objeto raiz padrão**, insira `index.html`
9. Mantenha as demais configurações padrão
10. Clique em **Criar distribuição**

### Atualizar política do bucket S3

11. Após criar a distribuição, o CloudFront exibirá um banner informando que é necessário atualizar a política do bucket. Clique em **Copiar política**
12. Navegue para o bucket S3 > aba **Permissões** > **Política do bucket**
13. Clique em **Editar** e cole a política copiada
14. Clique em **Salvar alterações**

### Configurar respostas de erro personalizadas (para SPA)

15. Na distribuição CloudFront, vá para a aba **Páginas de erro**
16. Clique em **Criar resposta de erro personalizada**
17. Configure para erro 403:
    - **Código de erro HTTP**: 403
    - **Personalizar resposta de erro**: Sim
    - **Caminho da página de resposta**: `/index.html`
    - **Código de resposta HTTP**: 200
18. Clique em **Criar resposta de erro personalizada**
19. Repita para erro 404:
    - **Código de erro HTTP**: 404
    - **Personalizar resposta de erro**: Sim
    - **Caminho da página de resposta**: `/index.html`
    - **Código de resposta HTTP**: 200
20. Clique em **Criar resposta de erro personalizada**

> **Nota:** Essas configurações permitem que o React Router funcione corretamente quando rotas são acessadas diretamente pela URL do navegador.

### Anotar URL do CloudFront

21. Aguarde o status da distribuição mudar para **Implantado** (pode levar alguns minutos)
22. Anote o **Nome de domínio da distribuição** (formato: `https://dxxxxxxxxxx.cloudfront.net`)
    - Esta URL é onde a aplicação estará acessível

### Atualizar origens CORS da Lambda

23. Volte para a função Lambda (Etapa 2) e atualize a variável de ambiente `ALLOWED_ORIGINS`:
    ```
    http://localhost:5173,https://dxxxxxxxxxx.cloudfront.net
    ```

---

## Etapa 6 (Opcional): Domínio Customizado

Esta etapa é opcional. A aplicação funciona perfeitamente com a URL padrão do CloudFront.

### Solicitar certificado ACM

1. Navegue para **AWS Certificate Manager (ACM)** na região **us-east-1** (obrigatório para CloudFront)
2. Clique em **Solicitar um certificado**
3. Selecione **Solicitar um certificado público** e clique em **Próximo**
4. Em **Nome de domínio totalmente qualificado**, insira seu domínio (ex: `app.seudominio.com.br`)
5. Em **Método de validação**, selecione **Validação de DNS**
6. Clique em **Solicitar**
7. Na página do certificado, anote os registros CNAME para validação DNS
8. Adicione os registros CNAME no seu provedor de DNS (ou Route 53)
9. Aguarde o status mudar para **Emitido** (pode levar até 30 minutos)

### Configurar domínio alternativo no CloudFront

10. Na distribuição CloudFront, clique em **Editar** nas configurações gerais
11. Em **Nome de domínio alternativo (CNAME)**, clique em **Adicionar item** e insira seu domínio (ex: `app.seudominio.com.br`)
12. Em **Certificado SSL personalizado**, selecione o certificado ACM criado acima
13. Clique em **Salvar alterações**

### Configurar registro DNS no Route 53

14. Navegue para **Route 53** > **Zonas hospedadas**
15. Selecione a zona hospedada do seu domínio
16. Clique em **Criar registro**
17. Configure:
    - **Nome do registro**: subdomínio desejado (ex: `app`)
    - **Tipo de registro**: **A**
    - Marque **Alias**
    - **Rotear tráfego para**: **Alias para distribuição do CloudFront**
    - Selecione a distribuição CloudFront
18. Clique em **Criar registros**

### Atualizar origens CORS

19. Atualize a variável de ambiente `ALLOWED_ORIGINS` da Lambda para incluir o domínio customizado:
    ```
    http://localhost:5173,https://dxxxxxxxxxx.cloudfront.net,https://app.seudominio.com.br
    ```

---

## Deploy do Frontend

### Build do projeto

1. Abra o PowerShell e navegue para a raiz do projeto:
   ```powershell
   cd C:\github\AWS-Cognito
   ```

2. Crie o arquivo `.env` a partir do template (se ainda não existir):
   ```powershell
   Copy-Item .env.example .env
   ```

3. Edite o arquivo `.env` com os valores reais obtidos nas etapas anteriores:
   ```env
   VITE_AWS_REGION=us-east-1
   VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
   VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev
   ```

4. Instale as dependências e execute o build:
   ```powershell
   npm install
   npm run build
   ```

5. Após o build, a pasta `dist/` será criada com os seguintes arquivos:
   - `index.html` — página principal
   - `assets/` — pasta com arquivos JavaScript e CSS compilados
   - `vite.svg` — ícone

> **⚠️ Atenção:** O Vite lê o arquivo `.env` (NÃO o `.env.example`) durante o build. Se o `.env` não existir, as variáveis de ambiente ficarão como `undefined` na aplicação.

### Upload para o S3

6. Via Console AWS:
   - Navegue para o bucket S3
   - **Exclua** qualquer arquivo antigo que esteja no bucket
   - Clique em **Carregar**
   - Arraste o **conteúdo** da pasta `C:\github\AWS-Cognito\dist\` (os arquivos `index.html`, `vite.svg` e a pasta `assets/`)
   - Clique em **Carregar**

   Ou via AWS CLI (PowerShell):
   ```powershell
   aws s3 sync C:\github\AWS-Cognito\dist\ s3://SEU-BUCKET-NAME --delete
   ```

> **⚠️ Importante:** Faça upload do conteúdo da pasta `dist/` do **frontend** (raiz do projeto). NÃO confunda com a pasta `backend/dist/` que contém o código da Lambda.

### Invalidar cache do CloudFront

7. Após o upload, invalide o cache para que as alterações sejam refletidas imediatamente:

   Via Console AWS:
   - Navegue para a distribuição CloudFront
   - Vá para a aba **Invalidações**
   - Clique em **Criar invalidação**
   - Em **Caminhos de objeto**, insira `/*`
   - Clique em **Criar invalidação**

   Ou via AWS CLI (PowerShell):
   ```powershell
   aws cloudfront create-invalidation --distribution-id SEU-DISTRIBUTION-ID --paths "/*"
   ```

8. Aguarde a invalidação ser concluída (status **Concluída**)

---

## Variáveis de Ambiente do Frontend

Crie um arquivo `.env` na raiz do projeto com os seguintes valores obtidos durante a configuração:

| Variável | Onde encontrar | Exemplo |
|----------|---------------|---------|
| `VITE_AWS_REGION` | Região do grupo de usuários | `us-east-1` |
| `VITE_COGNITO_USER_POOL_ID` | Cognito > Grupo de usuários > Visão geral | `us-east-1_AbCdEfGhI` |
| `VITE_COGNITO_USER_POOL_CLIENT_ID` | Cognito > Aplicações > Clientes da aplicação > ID do cliente | `1a2b3c4d5e6f7g8h9i0j1k2l3m` |
| `VITE_API_URL` | API Gateway > Estágios > dev > URL de invocação | `https://abc123def4.execute-api.us-east-1.amazonaws.com/dev` |

> **Segurança:** Nunca commite o arquivo `.env` com valores reais no repositório. O `.env` já está no `.gitignore`. Use o `.env.example` apenas como referência com valores placeholder.

---

## Verificação Final

Após completar todas as etapas, verifique se a aplicação está funcionando corretamente.

### Testar a aplicação

1. Acesse a URL do CloudFront (ou domínio customizado) no navegador
2. A página inicial com o tema dinossauro deve carregar (botões "Entrar" e "Criar conta")
3. Teste o **fluxo de registro**:
   - Clique em "Criar conta"
   - Preencha nome completo, apelido, email e senha
   - Um código de 6 dígitos será enviado para o email informado
   - Insira o código na tela de confirmação
   - Após confirmar, faça login com as credenciais criadas
4. Teste o **login**:
   - Na tela de login, insira email e senha
   - Após o login, o dashboard deve exibir seu nome, apelido e email
5. Teste o **perfil**:
   - Clique em "Meu perfil" e verifique se as informações aparecem
   - Teste a edição de nome e apelido
6. Teste o **logout**:
   - Clique em "Sair" e confirme que foi redirecionado para a página inicial

### Verificar usuários cadastrados no Cognito

Para validar que os usuários estão sendo criados corretamente:

1. No Console AWS, navegue para **Amazon Cognito**
2. Clique no grupo de usuários (`dino-login-app`)
3. No menu lateral, em **Gerenciamento de usuários**, clique em **Usuários**
4. A lista de usuários cadastrados aparecerá com as seguintes informações:
   - **Nome de usuário** (UUID gerado automaticamente)
   - **Status da conta** (Confirmado / Não confirmado)
   - **E-mail** do usuário
   - **Data de criação**
5. Clique em um usuário para ver detalhes:
   - **Atributos do usuário**: email, name, preferred_username, email_verified
   - **Status de confirmação**: se o email foi verificado

> **Dica:** Após registrar um usuário pela aplicação, verifique nesta tela se ele aparece com status "Confirmado" e com os atributos corretos (name, preferred_username, email).

### Testar o endpoint de health da API

Acesse diretamente no navegador:
```
https://SEU-API-ID.execute-api.us-east-1.amazonaws.com/dev/health
```

Deve retornar:
```json
{"status":"ok","message":"API funcionando corretamente"}
```

### Solução de Problemas

| Problema | Possível causa | Solução |
|----------|---------------|---------|
| `npm` não é reconhecido | Node.js não instalado | Instale o Node.js (seção Pré-requisitos) e reinicie o terminal |
| Erro no `Compress-Archive` | Executando de dentro da pasta `dist/` | Execute o comando a partir da pasta `backend/` usando caminhos completos |
| Página em branco no CloudFront | Objeto raiz padrão não configurado | Verifique se `index.html` está definido como Objeto raiz padrão |
| Página em branco (variáveis undefined) | Arquivo `.env` não existe | Crie o `.env` a partir do `.env.example` com valores reais e refaça o build |
| Erro 403 ao acessar rota direta | Resposta de erro personalizada não configurada | Configure respostas para erros 403 e 404 conforme Etapa 5 |
| Erro de CORS no console | Origem não adicionada na Lambda | Atualize `ALLOWED_ORIGINS` com a URL correta (CloudFront + domínio) |
| 401 na API | Token expirado ou Autorizador mal configurado | Verifique se a Origem do token está como `method.request.header.Authorization` |
| Erro "Invalid token source" no Autorizador | Campo "Origem do token" com ponto solto | Certifique-se que está `method.request.header.Authorization` (sem ponto extra) |
| Arquivos errados no S3 | Upload do backend em vez do frontend | O S3 recebe apenas `C:\...\dist\` (index.html + assets/). O `backend\dist\` vai para a Lambda via ZIP |
| Certificado não validando | Registros CNAME não propagados | Aguarde propagação DNS (até 48h) ou verifique registros |
| Usuário não aparece no Cognito | Registro falhou silenciosamente | Verifique o console do navegador (F12) para erros e confirme que o Client ID está correto |


---

## Projeto 2 — Implantação (Dino Game + ElastiCache)

> **Pré-requisito:** Todo o Projeto 1 (Cognito, Lambda, API Gateway, S3, CloudFront) já deve estar implantado e funcionando conforme as etapas anteriores deste guia.

Esta seção descreve os passos adicionais para implantar a funcionalidade do Dino Game com Amazon ElastiCache Serverless para Valkey.

---

### Passo 1: Criar VPC com 2 Subnets Privadas

A Lambda precisa estar dentro de uma VPC para se comunicar com o ElastiCache (que não é acessível pela internet).

1. Navegue para **VPC** no Console AWS (região **us-east-1**)
2. Clique em **Criar VPC**
3. Configure:
   - **Recursos a criar**: **VPC apenas**
   - **Tag de nome**: `dino-game-vpc`
   - **Bloco CIDR IPv4**: `10.20.0.0/16`
   - **Bloco CIDR IPv6**: Nenhum
4. Clique em **Criar VPC**

#### Criar Subnet Privada A

5. No menu lateral, clique em **Sub-redes** > **Criar sub-rede**
6. Configure:
   - **ID da VPC**: selecione `dino-game-vpc`
   - **Nome da sub-rede**: `dino-game-private-a`
   - **Zona de disponibilidade**: `us-east-1a`
   - **Bloco CIDR IPv4 da sub-rede**: `10.20.1.0/24`
7. Clique em **Criar sub-rede**

#### Criar Subnet Privada B

8. Repita o processo:
   - **Nome da sub-rede**: `dino-game-private-b`
   - **Zona de disponibilidade**: `us-east-1b`
   - **Bloco CIDR IPv4 da sub-rede**: `10.20.2.0/24`
9. Clique em **Criar sub-rede**

> **Nota:** Essas subnets são **privadas** (sem tabela de rotas para Internet Gateway). A Lambda não terá acesso à internet, mas se comunicará com o ElastiCache internamente e com o CloudWatch via VPC Endpoint (configurado no Passo 4).

> **⚠️ Importante — Habilitar DNS na VPC:** Após criar a VPC, é necessário habilitar resolução e hostnames DNS para que os VPC Endpoints funcionem corretamente:
> 1. Selecione `dino-game-vpc` na lista de VPCs
> 2. Clique em **Ações** > **Editar configurações de VPC**
> 3. Marque ✅ **Habilitar resolução DNS** (enableDnsSupport)
> 4. Marque ✅ **Habilitar nomes de host DNS** (enableDnsHostnames)
> 5. Salve

---

### Passo 2: Criar ElastiCache Serverless para Valkey

1. Navegue para **Amazon ElastiCache** no Console AWS (região **us-east-1**)
2. Clique em **Criar cache Serverless**
3. Configure:
   - **Motor**: **Valkey**
   - **Nome do cache**: `dino-game-cache`
   - **Descrição** (opcional): `Cache para sessões de jogo e ranking`
4. Em **Conectividade**:
   - **Criar novo VPC**: Não — selecione **Escolher VPC existente**
   - **VPC**: selecione `dino-game-vpc`
   - **Sub-redes**: selecione `dino-game-private-a` e `dino-game-private-b`
5. Em **Criptografia em trânsito**: mantenha **habilitada** (TLS obrigatório — padrão para Serverless)
6. Revise e clique em **Criar**
7. Aguarde o status mudar para **Disponível** (pode levar alguns minutos)
8. Anote o **Endpoint** exibido na página de detalhes do cache (formato: `dino-game-cache-xxxxxx.serverless.use1.cache.amazonaws.com`)
   - A porta padrão é **6379**

> **⚠️ Custos:** O ElastiCache Serverless cobra por uso (dados armazenados + ECPUs consumidas) enquanto o cache existir, mesmo sem tráfego. Se estiver usando apenas para aprendizado, **exclua o cache** após os testes para evitar cobranças contínuas. Consulte a [página de preços do ElastiCache](https://aws.amazon.com/elasticache/pricing/) para valores atualizados.

---

### Passo 3: Configurar Security Groups

Precisamos de dois Security Groups: um para a Lambda e outro para o ElastiCache, permitindo comunicação interna na porta 6379.

#### Criar Security Group da Lambda

1. Navegue para **VPC** > **Grupos de segurança** > **Criar grupo de segurança**
2. Configure:
   - **Nome**: `dino-game-lambda-sg`
   - **Descrição**: `Security group para Lambda do Dino Game`
   - **VPC**: selecione `dino-game-vpc`
3. **Regras de entrada (Inbound)**:
   - Tipo: **HTTPS** | Porta: `443` | Origem: o próprio SG (`dino-game-lambda-sg`) — necessário para que a Lambda se comunique com VPC Endpoints de interface
4. **Regras de saída (Outbound)**:
   - Tipo: **Todo o tráfego** | Destino: `0.0.0.0/0` (permite Lambda se conectar ao ElastiCache e VPC Endpoints)
5. Clique em **Criar grupo de segurança**
6. Anote o **ID do Security Group** (formato: `sg-xxxxxxxxxxxxxxxxx`)

> **⚠️ Nota sobre a regra de entrada HTTPS:** A Lambda precisa se comunicar com VPC Endpoints de interface (Logs) via porta 443. Como o endpoint usa o mesmo SG, a regra de ingress com origem no próprio SG permite essa comunicação.

#### Criar Security Group do ElastiCache

6. Crie outro grupo de segurança:
   - **Nome**: `dino-game-elasticache-sg`
   - **Descrição**: `Security group para ElastiCache do Dino Game`
   - **VPC**: selecione `dino-game-vpc`
7. **Regras de entrada (Inbound)**:
   - Tipo: **TCP personalizado** | Porta: `6379` | Origem: selecione o Security Group da Lambda (`dino-game-lambda-sg`)
8. **Regras de saída (Outbound)**: manter padrão (todo tráfego permitido)
9. Clique em **Criar grupo de segurança**

#### Associar Security Group ao ElastiCache

10. Navegue para **ElastiCache** > selecione o cache `dino-game-cache`
11. Em **Rede e segurança**, verifique/edite o Security Group para usar `dino-game-elasticache-sg`
    - Se o cache foi criado com o SG padrão, modifique para usar o novo SG

> **Resumo da regra:** Lambda SG (saída) → ElastiCache SG (entrada na porta 6379). Isso garante que apenas a Lambda consiga se conectar ao cache.

---

### Passo 4: Criar VPC Endpoint para CloudWatch Logs

Como a Lambda está em subnets privadas sem acesso à internet, ela precisa de um VPC Endpoint para enviar logs ao CloudWatch.

1. Navegue para **VPC** > **Endpoints** > **Criar endpoint**
2. Configure:
   - **Tag de nome**: `dino-game-logs-endpoint`
   - **Categoria do serviço**: **Serviços da AWS**
   - **Serviço**: busque e selecione `com.amazonaws.us-east-1.logs`
   - **VPC**: selecione `dino-game-vpc`
   - **Sub-redes**: selecione as duas subnets privadas (`dino-game-private-a` e `dino-game-private-b`)
   - **Grupos de segurança**: crie ou selecione um SG que permita **entrada TCP na porta 443** a partir do SG da Lambda (`dino-game-lambda-sg`)
   - **Política**: **Acesso total** (padrão)
3. Clique em **Criar endpoint**
4. Aguarde o status mudar para **Disponível**

> **Dica:** Sem esse endpoint, a Lambda não conseguirá enviar logs para o CloudWatch e os logs de erro do cache serão perdidos. Se preferir, você também pode criar um endpoint para `com.amazonaws.us-east-1.monitoring` (CloudWatch Metrics), mas o de Logs é o essencial.

---

### Passo 5: Atualizar a Função Lambda

A Lambda existente (`dino-login-api`) precisa ser atualizada com configuração de VPC, novas variáveis de ambiente e o código atualizado com a dependência `redis`.

#### Configurar VPC na Lambda

1. Navegue para **Lambda** > função `dino-login-api`
2. Vá para **Configuração** > **VPC**
3. Clique em **Editar**
4. Configure:
   - **VPC**: selecione `dino-game-vpc`
   - **Sub-redes**: selecione `dino-game-private-a` e `dino-game-private-b`
   - **Grupos de segurança**: selecione `dino-game-lambda-sg`
5. Clique em **Salvar**

> **⚠️ Atenção:** Após associar a Lambda a uma VPC privada, ela **perderá acesso à internet**. Isso significa que os endpoints públicos (como Cognito para validação de tokens) continuarão funcionando porque o API Gateway com Cognito Authorizer valida o token **antes** de invocar a Lambda. A Lambda em si não faz chamadas externas à internet.

#### Atualizar variáveis de ambiente

6. Em **Configuração** > **Variáveis de ambiente**, clique em **Editar**
7. Adicione as novas variáveis (mantendo `ALLOWED_ORIGINS` existente):

   | Chave | Valor | Descrição |
   |-------|-------|-----------|
   | `CACHE_ENDPOINT` | `dino-game-cache-xxxxxx.serverless.use1.cache.amazonaws.com` | Endpoint do ElastiCache (copiado no Passo 2) |
   | `CACHE_PORT` | `6379` | Porta do ElastiCache |
   | `CACHE_TLS` | `true` | Habilitar TLS (obrigatório para Serverless) |
   | `GAME_SESSION_TTL` | `1800` | TTL da sessão de jogo em segundos (30 min) |

8. Clique em **Salvar**

#### Atualizar permissões da Role da Lambda

9. Em **Configuração** > **Permissões**, clique na **Role de execução** (abre o IAM)
10. Verifique que a role possui a política gerenciada **AWSLambdaVPCAccessExecutionRole** (necessária para criar ENIs na VPC)
    - Se não tiver, clique em **Adicionar permissões** > **Anexar políticas** > busque `AWSLambdaVPCAccessExecutionRole` > **Anexar**

#### Deploy do novo código

11. No PowerShell, faça o build e empacotamento do backend atualizado:
    ```powershell
    cd "C:\github\Amazon Elasticache\backend"
    npm install
    npm run build
    Copy-Item -Path "node_modules" -Destination "dist\node_modules" -Recurse -Force
    Compress-Archive -Path "C:\github\Amazon Elasticache\backend\dist\*" -DestinationPath "C:\github\Amazon Elasticache\backend\lambda-function.zip" -Force
    Remove-Item -Path "dist\node_modules" -Recurse -Force
    ```

    > **⚠️ Importante:** O `node_modules` DEVE ser incluído dentro do ZIP junto com os arquivos compilados. Sem ele, a Lambda falhará com o erro `Cannot find module 'redis'`. O comando acima copia o `node_modules` para dentro do `dist/`, cria o ZIP, e depois limpa.

    > **⚠️ Caminhos com espaços:** Se o caminho do projeto contém espaços (ex: "Amazon Elasticache"), use aspas duplas em todos os paths do PowerShell.

12. Na página da Lambda, em **Origem do código**, clique em **Fazer upload de** > **Arquivo .zip**
13. Faça upload do novo `lambda-function.zip`
14. Clique em **Salvar**

> **Nota:** O pacote agora inclui a dependência `redis` (cliente Redis/Valkey para Node.js) que é empacotada junto no ZIP.

---

### Passo 6: Atualizar o API Gateway

Adicionar os novos recursos e métodos para os endpoints do jogo.

#### Criar recurso /game/start

1. Navegue para **API Gateway** > API `dino-login-api` > **Recursos**
2. Selecione o recurso `/game` (já criado no Projeto 1)
3. Clique em **Criar recurso**
   - **Nome do recurso**: `start`
   - Marque **Habilitar CORS do API Gateway**
4. Clique em **Criar recurso**

#### Criar método POST para /game/start

5. Com `/game/start` selecionado, clique em **Criar método**
6. Configure:
   - **Tipo de método**: **POST**
   - **Tipo de integração**: **Função Lambda**
   - Marque **Integração de proxy Lambda**
   - **Função Lambda**: `dino-login-api`
7. Em **Configurações de solicitação de método**:
   - **Autorização**: selecione **dino-login-cognito-authorizer**
8. Clique em **Criar método**

#### Criar recurso /game/score

9. Selecione o recurso `/game` e clique em **Criar recurso**
   - **Nome do recurso**: `score`
   - Marque **Habilitar CORS do API Gateway**
10. Clique em **Criar recurso**

#### Criar método POST para /game/score

11. Com `/game/score` selecionado, clique em **Criar método**
12. Configure:
    - **Tipo de método**: **POST**
    - **Tipo de integração**: **Função Lambda**
    - Marque **Integração de proxy Lambda**
    - **Função Lambda**: `dino-login-api`
13. Em **Configurações de solicitação de método**:
    - **Autorização**: selecione **dino-login-cognito-authorizer**
14. Clique em **Criar método**

#### Criar recurso /game/ranking

15. Selecione o recurso `/game` e clique em **Criar recurso**
    - **Nome do recurso**: `ranking`
    - Marque **Habilitar CORS do API Gateway**
16. Clique em **Criar recurso**

#### Criar método GET para /game/ranking

17. Com `/game/ranking` selecionado, clique em **Criar método**
18. Configure:
    - **Tipo de método**: **GET**
    - **Tipo de integração**: **Função Lambda**
    - Marque **Integração de proxy Lambda**
    - **Função Lambda**: `dino-login-api`
19. Em **Configurações de solicitação de método**:
    - **Autorização**: selecione **dino-login-cognito-authorizer**
20. Clique em **Criar método**

#### Criar recurso /game/me

21. Selecione o recurso `/game` e clique em **Criar recurso**
    - **Nome do recurso**: `me`
    - Marque **Habilitar CORS do API Gateway**
22. Clique em **Criar recurso**

#### Criar método GET para /game/me

23. Com `/game/me` selecionado, clique em **Criar método**
24. Configure:
    - **Tipo de método**: **GET**
    - **Tipo de integração**: **Função Lambda**
    - Marque **Integração de proxy Lambda**
    - **Função Lambda**: `dino-login-api`
25. Em **Configurações de solicitação de método**:
    - **Autorização**: selecione **dino-login-cognito-authorizer**
26. Clique em **Criar método**

#### Atualizar CORS dos novos recursos

27. Para cada novo recurso (`/game/start`, `/game/score`, `/game/ranking`, `/game/me`), caso o CORS não tenha sido configurado automaticamente:
    - Selecione o recurso
    - Clique em **Habilitar CORS**
    - Em **Access-Control-Allow-Headers**: `Authorization,Content-Type`
    - Em **Access-Control-Allow-Methods**: `GET,POST,OPTIONS`
    - Em **Access-Control-Allow-Origin**: `*`
    - Clique em **Salvar**

#### Reimplantar a API

28. Clique em **Implantar API**
29. Em **Estágio**, selecione o estágio existente **dev**
30. Clique em **Implantar**

> **Nota:** A URL de invocação continua a mesma. Os novos endpoints estarão disponíveis automaticamente após o deploy.

---

### Passo 7: Rebuild e Deploy do Frontend

O frontend foi atualizado com a página do jogo e precisa ser recompilado e reenviado para o S3.

#### Build do frontend

1. Abra o PowerShell e navegue para a raiz do projeto:
   ```powershell
   cd "C:\github\Amazon Elasticache"
   ```

2. **Verifique que o arquivo `.env` existe** na raiz do projeto com as variáveis do Cognito e API:
   ```env
   VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXX
   VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_API_URL=https://SEU-API-ID.execute-api.us-east-1.amazonaws.com/dev
   ```
   - **VITE_COGNITO_USER_POOL_ID**: Encontra em Cognito > seu User Pool > campo "ID do grupo de usuários"
   - **VITE_COGNITO_USER_POOL_CLIENT_ID**: Encontra em Cognito > User Pool > Integração de aplicativos > Clientes de aplicativos > "ID do cliente"
   - **VITE_API_URL**: URL base da API Gateway (sem barra final)

   > **⚠️ Importante:** Sem o arquivo `.env`, o frontend não conseguirá se comunicar com o Cognito nem com a API. O `.env` está no `.gitignore` e não é versionado — cada ambiente precisa criar o seu.

3. Instale dependências e execute o build:
   ```powershell
   npm install
   npm run build
   ```

4. Verifique que a pasta `dist/` foi gerada com sucesso (deve conter `index.html`, `assets/` e `vite.svg`)

#### Upload para o S3

5. Via Console AWS:
   - Navegue para o bucket S3 do frontend
   - **Exclua** o conteúdo antigo do bucket
   - Clique em **Carregar**
   - Arraste o **conteúdo** da pasta `dist/` (os arquivos `index.html`, `vite.svg` e a pasta `assets/`)
   - Clique em **Carregar**

   Ou via AWS CLI (PowerShell):
   ```powershell
   aws s3 sync "C:\github\Amazon Elasticache\dist\" s3://SEU-BUCKET-NAME --delete
   ```

#### Invalidar cache do CloudFront

6. Invalide o cache para que as alterações sejam refletidas imediatamente:

   Via Console AWS:
   - Navegue para a distribuição CloudFront
   - Vá para a aba **Invalidações**
   - Clique em **Criar invalidação**
   - Em **Caminhos de objeto**, insira `/*`
   - Clique em **Criar invalidação**

   Ou via AWS CLI (PowerShell):
   ```powershell
   aws cloudfront create-invalidation --distribution-id SEU-DISTRIBUTION-ID --paths "/*"
   ```

6. Aguarde a invalidação ser concluída (status **Concluída**)

7. Aguarde 1-2 minutos e teste o acesso à aplicação

---

### Verificação do Projeto 2

Após completar todos os passos, verifique o funcionamento:

1. Acesse a aplicação pela URL do CloudFront
2. Faça login com um usuário existente
3. No dashboard, clique em **Jogar** para acessar a página do jogo (`/game`)
4. Verifique que o jogo carrega corretamente:
   - O canvas do dinossauro deve aparecer
   - Pressione **Espaço** ou toque na tela para iniciar uma partida
   - Ao fim da partida (colisão), a pontuação deve ser registrada
5. Verifique o **ranking**: deve exibir os melhores jogadores
6. Teste o endpoint de status:
   ```
   https://SEU-API-ID.execute-api.us-east-1.amazonaws.com/dev/game/status
   ```
   Deve retornar:
   ```json
   { "game": "online", "cache": "connected" }
   ```

### Solução de Problemas — Projeto 2

| Problema | Possível causa | Solução |
|----------|---------------|---------|
| Lambda timeout ao acessar cache | Security Group não permite conexão | Verifique que o SG da Lambda permite saída e o SG do ElastiCache permite entrada na porta 6379 do SG da Lambda |
| Erro 503 nos endpoints do jogo | ElastiCache não acessível | Verifique endpoint, porta, TLS e que a Lambda está nas mesmas subnets |
| Logs não aparecem no CloudWatch | VPC Endpoint de Logs não configurado ou SG sem regra de entrada HTTPS | Crie o VPC Endpoint para `com.amazonaws.us-east-1.logs` (Passo 4) e garanta que o SG tenha regra de entrada TCP 443 com origem no próprio SG |
| Erro "Cannot find module 'redis'" | node_modules não incluído no ZIP | O ZIP da Lambda DEVE conter o `node_modules` no mesmo nível dos arquivos `.js`. Copie o `node_modules` para dentro do `dist/` antes de zipar |
| Erro "Internal server error" no /health | ZIP com estrutura errada | Verifique que o `index.js` está na raiz do ZIP (não dentro de uma subpasta `dist/`) |
| "Enabling private DNS requires enableDnsSupport and enableDnsHostnames" | DNS não habilitado na VPC | Em VPC > selecione a VPC > Ações > Editar configurações > Habilite resolução DNS e nomes de host DNS |
| "CreateNetworkInterface" permission error | Role da Lambda sem permissão VPC | Anexe a política `AWSLambdaVPCAccessExecutionRole` à role de execução da Lambda |
| "The operation cannot be performed at this time" | Atualização anterior em progresso | Aguarde 1-2 minutos para a atualização anterior finalizar e tente novamente |
| Login falha com "Ocorreu um erro inesperado" | Arquivo `.env` ausente ou com valores incorretos | Crie o `.env` na raiz do projeto com VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_USER_POOL_CLIENT_ID e VITE_API_URL corretos. Refaça o build e upload |
| Erro "ECONNREFUSED" nos logs | Endpoint do cache incorreto | Confirme o valor da variável `CACHE_ENDPOINT` na Lambda |
| Erro "CERT_UNTRUSTED" | TLS mal configurado | Confirme que `CACHE_TLS=true` e que está usando o endpoint correto |
| Compress-Archive falha no PowerShell | Caminho com espaços não está entre aspas | Use aspas duplas em todos os paths: `"C:\github\Amazon Elasticache\backend\dist\*"` |
| Lambda não cria ENI na VPC | Permissões insuficientes | Anexe a política `AWSLambdaVPCAccessExecutionRole` à role da Lambda |
| Ranking vazio após jogar | Username não sendo salvo | Verifique se `POST /game/start` está chamando `setPlayerUsername` corretamente |
| CORS error no POST | Método não permitido | Verifique que os recursos têm OPTIONS configurado e Allow-Methods inclui POST |

> **⚠️ Custos contínuos:** Enquanto o ElastiCache Serverless estiver ativo (mesmo sem tráfego), haverá cobrança pelo armazenamento mínimo. Para ambientes de aprendizado/teste, **exclua o cache serverless** quando não estiver em uso e recrie quando precisar testar novamente. Os dados de ranking serão perdidos ao excluir, mas para um ambiente de estudo isso é aceitável.
