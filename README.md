# BlipDialog

Decidi criar esse repositório pra ajudar outros desenvolvedores, pois não existe nenhuma documentação na internet com essa estrutura.

O BlipDialog é um servidor Node.js que atua como um proxy entre a plataforma Blip e um agente do Google Dialogflow CX. Ele gerencia a autenticação com o Google Cloud (usando uma conta de serviço e JWTs para obter tokens de acesso OAuth 2.0) e encaminha as mensagens do usuário do Blip para o agente Dialogflow CX, retornando a resposta do agente.

Este projeto inclui um mecanismo de cache para os tokens de acesso do Google, otimizando as chamadas e melhorando a eficiência.

## Funcionalidades Principais

* Proxy para encaminhamento de mensagens do Blip para o Dialogflow CX.
* Autenticação automática com a API do Google Dialogflow CX usando uma conta de serviço.
* Geração e assinatura de JWTs para obtenção de tokens de acesso OAuth 2.0.
* Cache inteligente de tokens de acesso para evitar requisições desnecessárias.
* Endpoint HTTP simples para integração com a ação "Requisição HTTP" do Blip.
* Configurável para diferentes projetos, localizações e agentes do Dialogflow CX.
* Logs detalhados para depuração.

## Tecnologias Utilizadas

* [Node.js](https://nodejs.org/)
* [Express.js](https://expressjs.com/)
* [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken#readme)
* [axios](https://axios-http.com/)

## Pré-requisitos

* Node.js (v16.x ou superior recomendado).
* NPM (geralmente instalado com o Node.js).
* Uma **Conta de Serviço Google Cloud** com as seguintes permissões para o projeto do seu agente Dialogflow CX:
    * `Dialogflow API User` (Cliente da API do Dialogflow) ou `roles/dialogflow.apiClient`.
    * Você precisará do arquivo JSON da chave desta conta de serviço. (Veja a seção "Como obter o arquivo JSON da chave da Conta de Serviço" na [Documentação da API]()).
* Um **Agente Dialogflow CX** já configurado e treinado.

## Configuração

1.  **Clone o Repositório (se aplicável):**
    ```bash
    git clone <url-do-seu-repositorio>
    cd BlipDialog
    ```

2.  **Arquivo de Credenciais Google:**
    * Obtenha o arquivo JSON da chave da sua Conta de Serviço Google (instruções na documentação completa ou [aqui](https://cloud.google.com/iam/docs/creating-managing-service-account-keys#creating)).
    * Renomeie o arquivo JSON baixado para `google-service-account.json` (ou o nome que preferir) e coloque-o na **raiz do projeto**.
    * **IMPORTANTE:** Adicione o nome deste arquivo ao seu `.gitignore` para evitar versioná-lo!
        ```
        # .gitignore
        node_modules/
        google-service-account.json
        *.log
        ```
    * No arquivo `app.js`, atualize a linha que carrega as credenciais, se você usou um nome diferente para o arquivo JSON:
        ```javascript
        const serviceAccount = require('./google-service-account.json'); // Ajuste este caminho/nome se necessário
        ```

3.  **Configurações do Agente Dialogflow CX:**
    * Abra o arquivo `app.js`.
    * Modifique as seguintes constantes com os detalhes **do seu agente Dialogflow CX específico**:
        ```javascript
        // Detalhes do seu Agente Dialogflow CX
        const PROJECT_ID = 'seu-gcp-project-id'; 
        const LOCATION_ID = 'regiao-do-seu-agente'; // ex: us-central1
        const AGENT_ID = 'id-do-seu-agente-cx'; 
        const LANGUAGE_CODE = 'idioma-do-agente';   // ex: pt-BR
        const DEFAULT_TIMEZONE = 'America/Sao_Paulo'; // Fuso horário padrão para o Dialogflow
        ```

4.  **Porta do Servidor (Opcional):**
    * A porta padrão é `3000`. Se precisar alterá-la, modifique a constante `PORT` em `app.js` ou defina a variável de ambiente `PORT`.


# Documentação da API: CXGateway

**Versão:** 1.0.0  
**Data:** 28 de maio de 2025

## 1. Introdução
O BlipDialog é um servidor Node.js que atua como um proxy entre a plataforma Blip e um agente do Google Dialogflow CX. Sua principal função é facilitar a comunicação, gerenciando a autenticação (obtenção de tokens de acesso OAuth 2.0 usando uma conta de serviço Google) e encaminhando as mensagens do usuário do Blip para o agente Dialogflow CX, retornando a resposta do agente para o Blip.

Esta API implementa um cache para os tokens de acesso, otimizando as chamadas e evitando a geração de um novo token a cada requisição.

## 2. Pré-requisitos
Antes de configurar e rodar esta API, certifique-se de que você possui:

### Node.js
Versão 16.x ou superior recomendada.

### Conta de Serviço Google Cloud

- Um arquivo JSON de chave da conta de serviço.
- Esta conta de serviço deve ter as permissões necessárias para interagir com a API do Dialogflow (ex: papel "Cliente da API do Dialogflow" ou "Dialogflow API User").

**Como obter o arquivo JSON da chave da Conta de Serviço:**

1. Acesse o Console do Google Cloud: Vá para [https://console.cloud.google.com/](https://console.cloud.google.com/).
2. Selecione o seu projeto.
3. Navegue para "IAM e administrador" > "Contas de serviço".
4. Crie uma nova conta de serviço ou use uma existente.
5. Gere uma nova chave JSON.

**Agente Dialogflow CX Configurado:**

- Project ID do Google Cloud.
- Location ID (Região) do agente (ex: us-central1).
- Agent ID do seu agente Dialogflow CX.
- Idioma padrão do agente (ex: pt-BR).

### NPM ou Yarn
Para gerenciamento de pacotes Node.js.

## 3. Configuração

### 3.1. Arquivo de Credenciais da Conta de Serviço
Renomeie seu arquivo JSON de chave da conta de serviço para um nome previsível, ex: `google-service-account.json`.  
Coloque este arquivo na raiz do projeto.  

**Importante:** NUNCA versione este arquivo em repositórios públicos.

### 3.2. Constantes da Aplicação

```javascript
const PROJECT_ID = 'seu-project-id';
const LOCATION_ID = 'sua-location-id';    // Ex: us-central1
const AGENT_ID = 'seu-agent-id';         // ID do seu agente
const LANGUAGE_CODE = 'seu-language-code'; // Ex: pt-BR
const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
```

### 3.3. Porta do Servidor

```javascript
const PORT = process.env.PORT || 3000;
```

## 4. Instalação de Dependências

```bash
npm install express jsonwebtoken axios
```

## 5. Como Rodar o Servidor

```bash
node app.js
```

(Substitua `app.js` pelo nome do seu arquivo principal).

## 6. Endpoint da API

### POST `/blip-webhook`

Este endpoint recebe a mensagem do usuário e um ID de sessão do Blip, encaminha para o Dialogflow CX e retorna a resposta do agente.

### 6.1. Cabeçalhos da Requisição

| Cabeçalho       | Valor              | Descrição                            |
|-----------------|--------------------|--------------------------------------|
| Content-Type    | application/json   | Indica que o corpo é um JSON.        |

### 6.2. Corpo da Requisição

```json
{
  "sessionId": "string_unica_por_conversa",
  "userMessage": "mensagem_do_usuario_aqui",
  "timeZone": "Fuso_Horario_Opcional"
}
```

### Exemplo:

```json
{
  "sessionId": "blip-contact-12345-xyz",
  "userMessage": "Gostaria de saber o saldo do meu cartão.",
  "timeZone": "America/Recife"
}
```

### 6.3. Resposta de Sucesso

```json
{
  "reply": "texto_da_resposta_do_agente"
}
```

### Exemplo:

```json
{
  "reply": "Claro! Para verificar o saldo, por favor, me informe os últimos 4 dígitos do seu cartão."
}
```

### 6.4. Respostas de Erro

**400 Bad Request:** Parâmetros inválidos.

```json
{
  "error": "Parâmetros inválidos.",
  "details": "É necessário fornecer \"sessionId\" e \"userMessage\" no corpo da requisição."
}
```

**500 Internal Server Error:** Falha interna.

```json
{
  "error": "Erro interno do servidor ao processar a mensagem.",
  "details": "Falha ao obter access token do Google."
}
```

## 7. Lógica Interna Principal

### 7.1. Cache de Token de Acesso
- Token é armazenado em memória.
- Renovação automática antes do vencimento.

### 7.2. Comunicação com Dialogflow CX
- Constrói requisição `detectIntent`.
- Envia e processa a resposta.
- Retorna texto consolidado ao Blip.

## 8. Considerações de Segurança

- **Chave da Conta de Serviço:** mantenha segura e fora do Git.
- **Proteção do Endpoint:** considere autenticação extra.

## 9. Como Testar

Use o **Postman**:

- Método: POST
- URL: `http://localhost:3000/blip-webhook`
- Headers: `Content-Type: application/json`
- Body:

```json
{
  "sessionId": "teste-postman-001",
  "userMessage": "Olá, como você está?",
  "timeZone": "America/Sao_Paulo"
}
```

## 10. Sugestões de Hospedagem

- **Render**: plano gratuito.
- **Fly.io**: Docker + cota grátis.
- **Vercel / Netlify**: Functions serverless.
- **Google Cloud Run**: Always Free Tier.
