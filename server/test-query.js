const pool = require('./db');
const query = `
    SELECT
        e.*,
        d.department_name,
        u.username as system_username,
        COALESCE(
            json_agg(
                DISTINCT jsonb_build_object(
                    'subject_id', s.subject_id,
                    'subject_name', s.subject_name,
                    'assignment_id', tsa.assignment_id
                )
            ) FILTER (WHERE s.subject_id IS NOT NULL),
            '[]'
        ) as assigned_subjects,
        COALESCE(
            json_agg(
                DISTINCT jsonb_build_object(
                    'class_id', c.class_id,
                    'class_name', c.class_name,
                    'section_id', sec.section_id,
                    'section_name', sec.section_name,
                    'is_class_teacher', tca.is_class_teacher,
                    'assignment_id', tca.assignment_id
                )
            ) FILTER (WHERE c.class_id IS NOT NULL),
            '[]'
        ) as assigned_classes
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.department_id
    LEFT JOIN app_users u ON e.app_user_id = u.id
    LEFT JOIN teacher_subject_assignment tsa ON e.employee_id = tsa.employee_id
    LEFT JOIN subjects s ON tsa.subject_id = s.subject_id
    LEFT JOIN teacher_class_assignment tca ON e.employee_id = tca.employee_id
    LEFT JOIN classes c ON tca.class_id = c.class_id
    LEFT JOIN sections sec ON tca.section_id = sec.section_id
    WHERE
        e.designation ILIKE '%teacher%'
        OR d.department_name = 'Teaching Staff'
    GROUP BY e.employee_id, d.department_name, u.username
    ORDER BY e.first_name ASC
`;
pool.query(query).then(res => {
    console.log('Success', res.rows.length);
    process.exit(0);
}).catch(err => {
    console.log('Error:', err.message);
    process.exit(1);
});