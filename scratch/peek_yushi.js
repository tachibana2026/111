import { read, utils } from 'xlsx';
import * as fs from 'fs';

const filePath = './scratch/groups_to_import.xlsx';
const buf = fs.readFileSync(filePath);
const workbook = read(buf);
const sheetName = '有志';
const worksheet = workbook.Sheets[sheetName];
const data = utils.sheet_to_json(worksheet, { header: 1 });

console.log('--- 有志 Sheet Columns ---');
console.log(data[0]);

console.log('\n--- 有志 Sample Data (First 3 rows) ---');
console.log(data.slice(1, 4));
