import { read, utils } from 'xlsx';
import * as fs from 'fs';

const filePath = './scratch/groups_to_import.xlsx';
const buf = fs.readFileSync(filePath);
const workbook = read(buf);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = utils.sheet_to_json(worksheet, { header: 1 });

console.log('--- Columns (First row) ---');
console.log(data[0]);

console.log('\n--- Sample Data (First 3 rows) ---');
console.log(data.slice(1, 4));
