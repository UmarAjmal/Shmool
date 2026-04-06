const pool = require('./db');
pool.query(
    SELECT e.employee_id, 
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object('id', s.subject_id)
        ) FILTER (WHERE s.subject_id IS NOT NULL),
        '[]'
    ) as subjects 
    FROM employees e 
    LEFT JOIN teacher_subject_assignment tsa ON e.employee_id = tsa.employee_id
    LEFT JOIN subjects s ON tsa.subject_id = s.subject_id 
    GROUP BY e.employee_id 
    LIMIT 2;
).then(res => { console.log(typeof res.rows[0].subjects, res.rows[0].subjects); process.exit(0); }).catch(console.error);
