const pool = require('./db'); pool.query(SELECT table_name FROM information_schema.tables WHERE table_schema='public').then(r => { console.log(r.rows.map(x=>x.table_name)); process.exit(0); });
