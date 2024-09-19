const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./messageTracking.db', (err) => {
    if (err) {
        console.error('Erro ao conectar no banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

db.run(`CREATE TABLE IF NOT EXISTS tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    option TEXT,
    replyTime TEXT,
    rowNumber INTEGER
)`);

// Registra uma interação de um usuário
function registerUserInteraction(user) {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO tracking (user) VALUES (?)`;
        db.run(query, [user], function (err) {
            if (err) {
                return reject(new Error('Erro ao registrar interação do usuário: ' + err.message));
            }
            resolve();
        });
    });
}

// Atualiza o rastreamento de um usuário
function updateMessageTracking(user, option, replyTime, rowNumber) {
    return new Promise((resolve, reject) => {
        const query = `UPDATE tracking SET option = ?, replyTime = ?, rowNumber = ? WHERE user = ?`;
        db.run(query, [option, replyTime, rowNumber, user], function (err) {
            if (err) {
                return reject(new Error('Erro ao atualizar rastreamento de mensagem: ' + err.message));
            }
            resolve();
        });
    });
}

// Limpa o rastreamento de um usuário
function clearUserTrackingData(user) {
    return new Promise((resolve, reject) => {
        const query = `DELETE FROM tracking WHERE user = ?`;
        db.run(query, [user], function (err) {
            if (err) {
                return reject(new Error('Erro ao limpar dados de rastreamento do usuário: ' + err.message));
            }
            resolve();
        });
    });
}

// Busca os dados de rastreamento de um usuário
function findUserTrackingData(user) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM tracking WHERE user = ?`;
        db.get(query, [user], (err, row) => {
            if (err) {
                return reject(new Error('Erro ao buscar dados de rastreamento do usuário: ' + err.message));
            }
            resolve(row);
        });
    });
}

module.exports = {
    registerUserInteraction,
    updateMessageTracking,
    clearUserTrackingData,
    findUserTrackingData
};