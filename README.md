BlipCXGateway
O BlipCXGateway é um servidor Node.js que atua como um proxy entre a plataforma Blip e um agente do Google Dialogflow CX. Ele gerencia a autenticação com o Google Cloud (usando uma conta de serviço e JWTs para obter tokens de acesso OAuth 2.0) e encaminha as mensagens do usuário do Blip para o agente Dialogflow CX, retornando a resposta do agente.

Este projeto inclui um mecanismo de cache para os tokens de acesso do Google, otimizando as chamadas e melhorando a eficiência.

Funcionalidades Principais
Proxy para encaminhamento de mensagens do Blip para o Dialogflow CX.

Autenticação automática com a API do Google Dialogflow CX usando uma conta de serviço.

Geração e assinatura de JWTs para obtenção de tokens de acesso OAuth 2.0.

Cache inteligente de tokens de acesso para evitar requisições desnecessárias.

Endpoint HTTP simples para integração com a ação "Requisição HTTP" do Blip.

Configurável para diferentes projetos, localizações e agentes do Dialogflow CX.

Tecnologias Utilizadas
Node.js

Express.js

jsonwebtoken

axios

Pré-requisitos
Node.js (v16.x ou superior recomendado).

NPM (geralmente instalado com o Node.js).

Uma Conta de Serviço Google Cloud com as seguintes permissões para o projeto do seu agente Dialogflow CX:

Dialogflow API User (Cliente da API do Dialogflow) ou similar.

Você precisará do arquivo JSON da chave desta conta de serviço.

Um Agente Dialogflow CX já configurado e treinado.

Configuração
Clone o Repositório:

git clone <url-do-seu-repositorio>
cd BlipCXGateway 

Arquivo de Credenciais Google:

Obtenha o arquivo JSON da chave da sua Conta de Serviço Google.

Renomeie-o para google-service-account.json (ou o nome que preferir) e coloque-o na raiz do projeto.

IMPORTANTE: Adicione o nome deste arquivo ao seu .gitignore para evitar versioná-lo! Ex:

# .gitignore
node_modules/
google-service-account.json 
*.log

No arquivo app.js, atualize a linha que carrega as credenciais, se você usou um nome diferente:

const serviceAccount = require('./google-service-account.json'); 

Configurações do Agente Dialogflow CX:

Abra o arquivo app.js.

Modifique as seguintes constantes com os detalhes do seu agente:

const PROJECT_ID = 'seu-gcp-project-id'; 
const LOCATION_ID = 'regiao-do-seu-agente'; // ex: us-central1
const AGENT_ID = 'id-do-seu-agente-cx'; 
const LANGUAGE_CODE = 'idioma-do-agente';   // ex: pt-BR
const DEFAULT_TIMEZONE = 'America/Sao_Paulo'; // Fuso horário padrão

Porta do Servidor (Opcional):

A porta padrão é 3000. Se precisar alterá-la, modifique a constante PORT em app.js ou defina a variável de ambiente PORT.

Instalação
No diretório raiz do projeto, instale as dependências:

npm install

Rodando o Projeto
Para iniciar o servidor:

node app.js

Ou, se você adicionar um script start ao seu package.json:

// package.json
{
  "scripts": {
    "start": "node app.js"
  }
}

Então você pode rodar com:

npm start

O servidor estará escutando na porta configurada (padrão: 3000).

Uso (Integração com Blip)
No seu fluxo do Blip, use uma ação de "Requisição HTTP" com as seguintes configurações:

Método: POST

URL: http://SEU_SERVIDOR_IP_OU_DOMINIO:PORTA/blip-webhook

Exemplo local: http://localhost:3000/blip-webhook

Cabeçalhos (Headers):

Content-Type: application/json

Corpo da Requisição (Body - tipo JSON):

{
  "sessionId": "{{contact.identity}}", 
  "userMessage": "{{input.content}}",
  "timeZone": "America/Sao_Paulo" // Opcional, mas recomendado
}

(Ajuste as variáveis {{...}} conforme as variáveis disponíveis no seu contexto do Blip).

Salvar Resposta:

Salve o corpo da resposta em uma variável (ex: apiResponse).

A resposta do agente estará em {{apiResponse@reply}}.

Testando com Postman
Método: POST

URL: http://localhost:3000/blip-webhook

Headers:

Content-Type: application/json

Body (raw, JSON):

{
  "sessionId": "postman-test-001",
  "userMessage": "Olá, tudo bem?",
  "timeZone": "America/New_York"
}

Estrutura do Projeto (Simplificada)
BlipCXGateway/
├── app.js                     # Lógica principal do servidor e API
├── google-service-account.json # SEU ARQUIVO DE CREDENCIAIS (NÃO VERSIONE!)
├── package.json               # Dependências e scripts do projeto
├── package-lock.json          # Lock das dependências
└── README.md                  # Este arquivo

Contribuição
Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

Licença
Este projeto é distribuído sob a licença MIT. Veja o arquivo LICENSE para mais detalhes (se você adicionar um).
