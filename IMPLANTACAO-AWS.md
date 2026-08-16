# Projeto 2 — Implantação (Dino Game + ElastiCache)

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
