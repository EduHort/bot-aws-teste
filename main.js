const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { addRowToExcel, findRowByOption } = require('./excelHandler.js');

// Numero do dono do bot - Colocar o numero do celular dono do whatsapp /////////////////////////////////////////
const numeroDono = '554396183723@c.us';
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Cria uma nova instância do cliente
const client = new Client({
    authStrategy: new LocalAuth(),
});

// Quando o cliente estiver pronto, execute este código (apenas uma vez)
client.once('ready', () => {
    console.log('Cliente está pronto!');
});

// Quando o cliente receber o QR-Code
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

// Inicia o cliente
client.initialize();

// Objeto para armazenar o tempo quando uma mensagem específica foi enviada e estado de pergunta
const messageTracking = {};

// Mapa de opções associando os números ao que eles representam
const optionsMap = {
    '1': 'Comercial',
    '2': 'Contas a Receber (Clientes)',
    '3': 'Contas a Pagar (Fornecedores)',
    '4': 'Faturamento / Heishop',
    '5': 'Entrega',
    '6': 'Chopp Delivery',
    '7': 'Recursos Humanos',
    '8': 'Elogios ou Reclamações',
    '9': 'Alterar Cadastro',
    '10': 'Cancelar'
};

// Função para enviar a mensagem inicial e rastreá-la
const setCliente = async (message) => {
    // Armazena o cliente quando a mensagem foi enviada e redefine a flag de resposta
    messageTracking[message.to] = {
        responded: false,
        userReplyTime: null,
        isWaitingForAttendant: false,
        userChoice: null,
        userOption: null,
        rowNumber: null,
    };
};

// Escuta todas as mensagens recebidas
client.on('message_create', async message => {
    if (message.body.includes('Por favor digite o número da opção que você deseja') && message.from === numeroDono) {
        await setCliente(message);
    }
    else if (messageTracking[message.from] && !messageTracking[message.from].responded) {
        // Verifica se a resposta é uma das opções válidas (1-10)
        if (/^[1-9]$|^10$/.test(message.body.trim())) {
            // Armazena o numero escolhido
            const userChoice = message.body.trim();
            messageTracking[message.from].userChoice = userChoice;

            // Armazena o setor escolhido
            const userOption = optionsMap[userChoice];
            messageTracking[message.from].userOption = userOption;

            // Marca como respondido para evitar mais respostas a esta mensagem específica
            messageTracking[message.from].responded = true;

            // Armazena o tempo em que a resposta foi enviada pelo cliente
            messageTracking[message.from].userReplyTime = new Date();
            messageTracking[message.from].isWaitingForAttendant = true;

            const currentTime = new Date().toLocaleString();

            // Adiciona uma nova linha no Excel com os dados do cliente
            addRowToExcel([message.from.replace('@c.us', ''), userOption, currentTime]);

            // Encontra a linha onde foi registrada a resposta do cliente
            const rowNumber = findRowByOption(currentTime);
            messageTracking[message.from].rowNumber = rowNumber;  // Armazena o número da linha
        } 
    } 
    else if (message.from === numeroDono && messageTracking[message.to] && messageTracking[message.to].isWaitingForAttendant) {
        if(!message.body.includes('estou encaminhando para atendimento')){
            // Captura o tempo quando o atendente envia uma mensagem após a mensagem de encaminhamento
            const atendenteReplyTime = new Date();

            // Calcula a diferença de tempo entre a resposta válida do cliente e a resposta do atendente
            const { userReplyTime, rowNumber } = messageTracking[message.to];
            let timeDiff = (atendenteReplyTime - userReplyTime) / 1000;

            const weekday = atendenteReplyTime.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().slice(0, 3);
            const dateAndTime = atendenteReplyTime.toLocaleString();

            // Atualiza a linha do Excel com as novas informações
            addRowToExcel([null, null, null, weekday, dateAndTime, timeDiff.toFixed(2)], true, rowNumber);
        
            // Limpa o rastreamento do tempo de resposta
            delete messageTracking[message.to];
        }
    }
});
