const xlsx = require('xlsx');
const fs = require('fs');

// Caminho do arquivo Excel
const excelFilePath = './respostas.xlsx';

// Função para carregar ou criar o arquivo Excel
const loadWorkbook = () => {
    let workbook;
    if (fs.existsSync(excelFilePath)) {
        const fileBuffer = fs.readFileSync(excelFilePath);
        workbook = xlsx.read(fileBuffer, { type: "buffer" });
    } else {
        workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.aoa_to_sheet([["Numero", "Setor", "Data", "Dia Semana", "Resposta", "Tempo"]]);
        xlsx.utils.book_append_sheet(workbook, worksheet, "Respostas");
        xlsx.writeFile(workbook, excelFilePath);
    }
    return workbook;
};

// Função para adicionar uma nova linha ao arquivo Excel
const addRowToExcel = (rowData, update = false, rowNumber = null) => {
    const workbook = loadWorkbook();
    const sheet = workbook.Sheets["Respostas"];

    if (update && rowNumber !== null) {
        // Atualiza uma linha existente
        const range = xlsx.utils.decode_range(sheet['!ref']);
        const targetRow = range.s.r + rowNumber; // Encontra a linha correta

        // Atualiza cada célula na linha existente
        rowData.forEach((value, index) => {
            const cellAddress = xlsx.utils.encode_cell({ r: targetRow, c: index });
            sheet[cellAddress] = { t: 's', v: value || sheet[cellAddress]?.v };
        });
    } else {
        // Adiciona uma nova linha
        xlsx.utils.sheet_add_aoa(sheet, [rowData], { origin: -1 });
    }

    // Salva imediatamente após a operação
    xlsx.writeFile(workbook, excelFilePath);
};

// Função para encontrar a linha onde está o setor escolhido pelo cliente
const findRowByOption = (messageTime) => {
    const workbook = loadWorkbook();
    const sheet = workbook.Sheets["Respostas"];
    const range = xlsx.utils.decode_range(sheet['!ref']);
    
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
        const cellAddress = xlsx.utils.encode_cell({ r: row, c: 2 });
        if (sheet[cellAddress] && sheet[cellAddress].v === messageTime) {
            return row; // Retorna o índice da linha
        }
    }
    return null;
};

module.exports = {
    addRowToExcel,
    findRowByOption
  };