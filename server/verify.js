const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: 'D:/peronal/SMS_Pern/server/.env' });

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkColumns() {
  try {
    const backupSqlFiles = fs.readdirSync('D:/peronal/SMS_Pern/server/backups').filter(f => f.endsWith('.sql'));
    if (backupSqlFiles.length === 0) return console.log('no sql files');
    const backupContent = fs.readFileSync('D:/peronal/SMS_Pern/server/backups/' + backupSqlFiles[0], 'utf8');
    
    let missingCols = [];
    const query = await dbPool.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'");
    const dbCols = {};
    for (const row of query.rows) {
        if (!dbCols[row.table_name]) dbCols[row.table_name] = [];
        dbCols[row.table_name].push(row.column_name);
    }
    
    let currentTable = null;
    for (const line of backupContent.split('\n')) {
        const trimmed = line.trim();
        const startMatch = trimmed.match(/^CREATE TABLE public\.([a-zA-Z0-9_]+)/);
        if (startMatch) {
            currentTable = startMatch[1];
            continue;
        }
        if (trimmed === ');' || trimmed === ');\r') {
            currentTable = null;
            continue;
        }
        
        if (currentTable && trimmed && !trimmed.startsWith('--') && !trimmed.startsWith('CONSTRAINT') && !trimmed.startsWith('UNIQUE') && !trimmed.startsWith('PRIMARY KEY')) {
            const colName = trimmed.split(' ')[0].replace(/\"/g, '');
            if (colName && colName.match(/^[a-zA-Z0-9_]+$/)) {
                if (dbCols[currentTable] && !dbCols[currentTable].includes(colName)) {
                    missingCols.push({table: currentTable, col: colName});
                }
            }
        }
    }

    console.log('Missing columns in Supabase:');
    console.dir(missingCols);

  } catch(e){ console.error(e) } finally { dbPool.end(); }
}
checkColumns();