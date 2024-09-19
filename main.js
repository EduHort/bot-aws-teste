const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { addRowToExcel, findRowByOption } = require('./excelHandler.js');
const { registerUserInteraction, updateMessageTracking, clearUserTrackingData, findUserTrackingData } = require('./dbHandler.js');
const { calculateWorkingTime } = require('./timeHandler.js');

// Numero do dono do bot - O programa pega o número automaticamente
let numeroDono = '';

// Cria uma nova instância do cliente
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

// Quando o cliente estiver pronto, execute este código (apenas uma vez)
client.once('ready', () => {
    console.log('Cliente está pronto!');
    numeroDono = client.info.wid.user + '@c.us';
    console.log(numeroDono);
});

// Quando o cliente receber o QR-Code
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

// Inicia o cliente
client.initialize();

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

// Escuta todas as mensagens recebidas
client.on('message_create', async message => {
    try {
        // Busca os dados do usuário no banco de dados
        let userData = null;
        if(message.from !== numeroDono){
            userData = await findUserTrackingData(message.from);
        }
        else{
            userData = await findUserTrackingData(message.to);
        }
        // Verifica se a mensagem indica um novo usuário que precisa ser registrado
        if (message.body.includes('Por favor digite o número da opção que você deseja') && message.from === numeroDono && !userData) {
            // Registra o novo usuário no banco de dados
            await registerUserInteraction(message.to);
        } 
        // Verifica se o usuário existe e está esperando para escolher uma opção (1 a 9)
        else if (userData && !userData.option && !userData.replyTime && !userData.rowNumber) {
            // Verifica se a resposta do cliente é uma opção válida (1-9)
            if (/^[1-9]$/.test(message.body.trim())) {     //ver o que acontece se a mensagem tiver espaços.
                const userChoice = message.body.trim();
                const userOption = optionsMap[userChoice]; // Obtém a opção correspondente ao número
                const currentTime = new Date();

                // Adiciona os dados do cliente na planilha Excel
                addRowToExcel([message.from.replace('@c.us', ''), userOption, currentTime.toLocaleString()]);
                
                // Encontra o número da linha onde a resposta do cliente foi registrada na planilha
                const rowNumber = findRowByOption(currentTime.toLocaleString()); 

                // Atualiza os dados do usuário no banco de dados com a opção, tempo e número da linha
                await updateMessageTracking(message.from, userOption, currentTime.toISOString(), rowNumber);
            // Verifica se o cliente digitou '10' (Reiniciar o fluxo?)
            } else if (/^10$/.test(message.body.trim())) {
                // Limpa os dados de rastreamento do usuário no banco de dados
                await clearUserTrackingData(message.to); 
            }
        }
        // Verifica se a mensagem é do atendente e se o usuário está sendo atendido
        else if (message.from === numeroDono && userData && userData.option && userData.replyTime && userData.rowNumber) {
            // Verifica se a mensagem do atendente NÃO contém frases específicas 
            if (!message.body.includes('estou encaminhando para atendimento') && !message.body.includes('Estamos fechados no momento') && !message.body.includes('Nossos atendentes estão em horário de almoço')) {
                const replyTime = new Date(userData.replyTime);
                const rowNumber = userData.rowNumber;
                const atendenteReplyTime = new Date();
                
                // Calcula o tempo de resposta do atendente
                const timeDiff = calculateWorkingTime(replyTime, atendenteReplyTime); 

                const weekday = atendenteReplyTime.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().slice(0, 3);
                const dateAndTime = atendenteReplyTime.toLocaleString();

                // Adiciona os dados do atendente na planilha, na mesma linha do cliente
                addRowToExcel([null, null, null, weekday, dateAndTime, timeDiff.toFixed(2)], true, rowNumber);
                
                // Limpa os dados de rastreamento do usuário no banco de dados
                await clearUserTrackingData(message.to);
            }
        }
    } catch (err) {
        // Captura e imprime erros no console
        console.error('Erro ao processar mensagem:', err); 
    }
});
