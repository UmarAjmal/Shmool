const pool=require('./db'); pool.query(SELECT username FROM app_users WHERE username LIKE 'STU-%').then(r=>console.log(r.rows)).catch(console.error).finally(()=>process.exit(0));
