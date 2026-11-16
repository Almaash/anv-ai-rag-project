const XLSX = require('xlsx');
const path = require('path');

const filePath = 'C:\\Users\\DELL\\Downloads\\Investor portfolio sheet (2).xlsx';
const workbook = XLSX.readFile(filePath, { cellFormula: true }); // Ensure cellFormula is true
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Get all rows
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('--- Column Names ---');
console.log(data[0]);

// Find all formulas in the spreadsheet
const range = XLSX.utils.decode_range(worksheet['!ref']);
console.log('\n--- ALL Formulas in spreadsheet ---');
for (let r = range.s.r; r <= range.e.r; r++) {
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellAddress = XLSX.utils.encode_cell({ r, c });
    const cell = worksheet[cellAddress];
    if (cell && (cell.f || cell.v !== undefined)) {
        if (cell.f) {
            console.log(`${cellAddress}: Value=${cell.v}, Formula=${cell.f}`);
        } else {
             // console.log(`${cellAddress}: Value=${cell.v}`);
        }
    }
  }
}

// Map the first few rows to see content clearly
console.log('\n--- First 20 rows data ---');
for(let i=0; i<20; i++) {
    console.log(`Row ${i+1}:`, data[i]);
}
