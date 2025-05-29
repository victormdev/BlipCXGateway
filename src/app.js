// Importa as bibliotecas necessárias
const express = require('express'); // Framework web para Node.js, usado para criar o servidor e as rotas da API
const jwt = require('jsonwebtoken'); // Para criar JSON Web Tokens, usados na autenticação com a API do Google
const axios = require('axios'); // Cliente HTTP para fazer requisições para a API do Google/Dialogflow

// --- CONFIGURAÇÕES DE SERVIÇO E AUTENTICAÇÃO ---
// Carrega as credenciais da conta de serviço a partir de um arquivo JSON local.
// SUBSTITUA 'path/to/your-service-account-credentials.json' pelo caminho real do seu arquivo de credenciais.
// Este arquivo contém informações sensíveis para autenticação com os serviços do Google Cloud.
const serviceAccount = require('./path/to/your-service-account-credentials.json');

// Extrai informações da conta de serviço necessárias para autenticação.
// Os valores reais virão do arquivo JSON acima. Placeholders são fornecidos como exemplo.
const privateKey = serviceAccount.private_key || 'YOUR_SERVICE_ACCOUNT_PRIVATE_KEY_PLACEHOLDER';
const clientEmail = serviceAccount.client_email || 'your-service-account-email@example-project.iam.gserviceaccount.com';
const tokenUri = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token';

// --- CONFIGURAÇÕES DO AGENTE DE NLU (ex: Dialogflow CX) ---
// SUBSTITUA os valores placeholder abaixo com as informações específicas do seu projeto e agente no Google Cloud / Dialogflow.
const PROJECT_ID = 'YOUR_GOOGLE_CLOUD_PROJECT_ID';         // ID do seu projeto no Google Cloud onde o agente Dialogflow está.
const LOCATION_ID = 'YOUR_AGENT_LOCATION_ID';             // Localização do seu agente Dialogflow (ex: 'us-central1', 'global').
const AGENT_ID = 'YOUR_DIALOGFLOW_AGENT_ID';                 // ID do seu agente específico no Dialogflow CX.
const LANGUAGE_CODE = 'YOUR_DEFAULT_LANGUAGE_CODE';         // Código de idioma padrão para as interações (ex: 'pt-BR', 'en-US').
const DEFAULT_TIMEZONE = 'YOUR_DEFAULT_TIMEZONE';         // Fuso horário padrão para as sessões (ex: 'America/Sao_Paulo', 'Europe/Madrid').

// Porta em que o servidor irá escutar. Usa a variável de ambiente PORT ou 3000 como padrão.
const PORT = process.env.PORT || 3000;

// Objeto para armazenar em cache o token de acesso OAuth2 para evitar requisitá-lo repetidamente.
let cachedAccessToken = {
  token: null,     // O token de acesso em si.
  expiresAt: 0,    // Timestamp (em segundos) de quando o token expira.
};

// Cria uma instância do aplicativo Express.
const app = express();
// Middleware para fazer o parse de corpos de requisição JSON.
app.use(express.json());

// --- FUNÇÕES DE AUTENTICAÇÃO E GERENCIAMENTO DE TOKEN ---

/**
 * Gera um JSON Web Token (JWT) assinado para autenticação com a API do Google.
 * Este JWT será trocado por um Access Token OAuth2.
 * @async
 * @returns {Promise<string>} O JWT assinado.
 */
async function getJwtToken() {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail, // Emissor do token (email da conta de serviço)
    scope: 'https://www.googleapis.com/auth/dialogflow', // Escopo de permissões solicitado para Dialogflow
    aud: tokenUri,    // Audiência do token (URL do endpoint de token do Google)
    iat: nowInSeconds, // Timestamp de quando o token foi emitido (issued at)
    exp: nowInSeconds + 3500, // Timestamp de quando o token expira (geralmente 1 hora, aqui um pouco menos para segurança)
  };
  console.log('Gerando novo JWT para autenticação com Google Cloud...');
  return jwt.sign(payload, privateKey, { algorithm: 'RS256' }); // Assina o payload com a chave privada
}

/**
 * Busca um novo Access Token da API do Google OAuth2 usando o JWT gerado.
 * Atualiza o cache com o novo token.
 * @async
 * @returns {Promise<string>} O novo Access Token.
 * @throws {Error} Se houver falha ao obter o token.
 */
async function fetchNewAccessToken() {
  console.log('Tentando obter novo Access Token do Google Cloud...');
  try {
    const jwtToken = await getJwtToken(); // Gera o JWT necessário

    // Prepara os parâmetros para a requisição do Access Token
    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer'); // Tipo de concessão
    params.append('assertion', jwtToken); // O JWT como asserção

    // Faz a requisição POST para o endpoint de token do Google
    const response = await axios.post(tokenUri, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const expiresIn = response.data.expires_in; // Tempo de vida do token em segundos
    cachedAccessToken.token = response.data.access_token; // Armazena o token
    // Calcula o tempo de expiração, com uma margem de 60 segundos para segurança
    cachedAccessToken.expiresAt = Math.floor(Date.now() / 1000) + expiresIn - 60;

    console.log('Novo Access Token obtido e cacheado. Válido até:', new Date(cachedAccessToken.expiresAt * 1000).toLocaleString());
    return cachedAccessToken.token;
  } catch (err) {
    console.error(
      'Erro crítico ao obter novo access token do Google:',
      err.response?.data || err.message || err // Log detalhado do erro
    );
    // Limpa o cache em caso de falha
    cachedAccessToken.token = null;
    cachedAccessToken.expiresAt = 0;
    throw new Error('Falha ao obter access token do Google Cloud.');
  }
}

/**
 * Obtém um Access Token válido, seja do cache ou buscando um novo se o cacheado estiver expirado.
 * @async
 * @returns {Promise<string>} Um Access Token válido para a API do Google.
 */
async function getValidAccessToken() {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (cachedAccessToken.token && nowInSeconds < cachedAccessToken.expiresAt) {
    console.log('Usando Access Token do cache.');
    return cachedAccessToken.token;
  }
  console.log('Cache do Access Token expirado ou inválido. Buscando um novo...');
  return fetchNewAccessToken();
}

// --- FUNÇÃO DE INTERAÇÃO COM O SERVIÇO DE NLU (Dialogflow CX) ---

/**
 * Envia uma mensagem do usuário para o Dialogflow CX para detectar a intenção.
 * @async
 * @param {string} accessToken - O Access Token OAuth2 válido.
 * @param {string} sessionId - Um identificador único para a sessão de conversação.
 * @param {string} userMessage - A mensagem enviada pelo usuário.
 * @param {string} [timeZone=DEFAULT_TIMEZONE] - O fuso horário do usuário.
 * @returns {Promise<object>} Um objeto contendo a resposta do agente e a resposta completa do Dialogflow.
 * @throws {Error} Se houver falha na comunicação com a API do Dialogflow.
 */
async function detectUserIntent(accessToken, sessionId, userMessage, timeZone = DEFAULT_TIMEZONE) {
  // Constrói o caminho da sessão para a API do Dialogflow CX
  const sessionPath = `projects/${PROJECT_ID}/locations/${LOCATION_ID}/agents/${AGENT_ID}/sessions/${sessionId}`;
  // URL do endpoint da API do Dialogflow CX v3 para detectar intenção
  const dialogflowApiUrl = `https://${LOCATION_ID}-dialogflow.googleapis.com/v3/${sessionPath}:detectIntent`;

  // Corpo da requisição para a API do Dialogflow
  const requestBody = {
    queryInput: {
      text: { text: userMessage },
      languageCode: LANGUAGE_CODE,
    },
    queryParams: {
      timeZone: timeZone,
    },
  };

  // Log detalhado da requisição (para debugging)
  console.log('\n--- DETALHES DA REQUISIÇÃO PARA DIALOGFLOW CX ---');
  console.log('Timestamp:', new Date().toISOString());
  console.log('URL:', dialogflowApiUrl);
  console.log('Cabeçalhos (parcial):', {
    Authorization: `Bearer ${accessToken ? 'TOKEN_PRESENTE_COM_TAMANHO_' + accessToken.length : 'TOKEN_AUSENTE'}`,
    'Content-Type': 'application/json',
  });
  console.log('Corpo da Requisição:', JSON.stringify(requestBody, null, 2));
  console.log('--- FIM DETALHES DA REQUISIÇÃO ---\n');

  try {
    console.log(`Enviando para Dialogflow CX: Sessão=${sessionId}, Mensagem='${userMessage}'`);
    // Faz a requisição POST para a API do Dialogflow CX
    const response = await axios.post(dialogflowApiUrl, requestBody, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Resposta bruta do Dialogflow CX recebida (status ' + response.status + ')');

    // Extrai o texto da resposta do agente de forma robusta
    let fulfillmentText = "Desculpe, não consegui processar sua solicitação no momento.";
    if (response.data?.queryResult?.responseMessages) {
      const textMessages = response.data.queryResult.responseMessages.filter(
        (msg) => msg.text?.text?.length > 0
      );
      if (textMessages.length > 0) {
        fulfillmentText = textMessages.map((msg) => msg.text.text.join('\n')).join('\n');
      } else if (response.data?.queryResult?.fulfillmentText) {
        fulfillmentText = response.data.queryResult.fulfillmentText;
        if (!fulfillmentText) fulfillmentText = "Recebi uma resposta, mas sem texto para exibir.";
      }
    } else if (response.data?.queryResult?.fulfillmentText) {
        fulfillmentText = response.data.queryResult.fulfillmentText;
        if (!fulfillmentText) fulfillmentText = "Recebi uma resposta, mas sem texto para exibir (via fulfillmentText).";
    }

    console.log('Resposta do Agente Dialogflow (texto extraído):', fulfillmentText);
    return {
        responseText: fulfillmentText,           // Apenas o texto da resposta para o usuário
        fullDialogflowResponse: response.data    // A resposta completa da API do Dialogflow para possível processamento adicional
    };

  } catch (err) {
    console.error(
      'Erro ao chamar API Dialogflow CX (detectIntent):',
      err.response?.data || err.message || err // Log detalhado do erro
    );
    const dfError = err.response?.data?.error?.message || 'Falha na comunicação com o Dialogflow CX.';
    throw new Error(dfError);
  }
}

// --- ENDPOINTS DA API ---

/**
 * Endpoint para receber webhooks de uma plataforma de chatbot ou qualquer serviço externo.
 * Processa a mensagem do usuário, interage com o Dialogflow CX e retorna a resposta.
 */
app.post('/generic-webhook-endpoint', async (req, res) => {
  console.log(`\n--- Requisição recebida em /generic-webhook-endpoint às ${new Date().toISOString()} ---`);
  console.log('Corpo da requisição recebida:', req.body);

  // Extrai dados esperados do corpo da requisição.
  // A estrutura (sessionId, userMessage, timeZone) é um exemplo comum.
  const { sessionId, userMessage, timeZone } = req.body;

  // Validação básica dos parâmetros recebidos
  if (!sessionId || !userMessage) {
    console.warn('Requisição inválida: sessionId ou userMessage faltando.');
    return res.status(400).json({
      error: 'Parâmetros inválidos.',
      details: 'É necessário fornecer "sessionId" e "userMessage" no corpo da requisição.'
    });
  }

  try {
    // 1. Obtém um token de acesso válido para o Google Cloud
    const accessToken = await getValidAccessToken();
    // 2. Envia a mensagem do usuário para o Dialogflow CX para obter a resposta do agente
    const agentResponse = await detectUserIntent(accessToken, sessionId, userMessage, timeZone || DEFAULT_TIMEZONE);

    console.log('Enviando resposta para o solicitante:', { reply: agentResponse.responseText });
    // Retorna a resposta do agente para a plataforma que originou o webhook
    res.json({
      reply: agentResponse.responseText,
      // rawDialogflowData: agentResponse.fullDialogflowResponse, // Opcional: enviar dados brutos do Dialogflow de volta
    });

  } catch (error) {
    console.error('Erro no processamento do endpoint /generic-webhook-endpoint:', error.message, error.stack);
    res.status(500).json({
      error: 'Erro interno do servidor ao processar a mensagem.',
      details: error.message,
    });
  }
});

/**
 * Endpoint raiz para verificação de status do servidor.
 */
app.get('/', (req, res) => {
  res.send('Servidor Node.js para proxy do Dialogflow CX está no ar! Use POST em /generic-webhook-endpoint.');
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor Node.js rodando na porta ${PORT}`);
  console.log(`Endpoint para webhook (ex: de uma plataforma de chat): POST http://localhost:${PORT}/generic-webhook-endpoint`);
  console.log(`Aguardando requisições...`);
});