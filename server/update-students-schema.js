const pool = require('./db');

const updateStudentsTableComprehensive = async () => {
    try {
        console.log("Upgrading Students Table to Comprehensive International Standards...");
        
        // Dropping old table to reimplement full schema
        await pool.query(`DROP TABLE IF EXISTS students CASCADE;`);

        await pool.query(`
            CREATE TABLE students (
                student_id SERIAL PRIMARY KEY,
                
                -- System Identifiers
                admission_no VARCHAR(50) UNIQUE NOT NULL,
                roll_no VARCHAR(50),
                status VARCHAR(20) DEFAULT 'Active', -- Active, Left, Alumnus, Suspended
                
                -- Academic Info
                class_id INTEGER REFERENCES classes(class_id),
                section_id INTEGER REFERENCES sections(section_id),
                admission_date DATE DEFAULT CURRENT_DATE,
                category VARCHAR(50) DEFAULT 'Normal', -- 'Normal', 'Trusted'
                
                -- Student Personal Info
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100),
                gender VARCHAR(20),
                dob DATE,
                cnic_bform VARCHAR(50), -- B-Form / CNIC number
                religion VARCHAR(50),
                blood_group VARCHAR(10),
                
                -- Disability Info
                has_disability BOOLEAN DEFAULT FALSE,
                disability_details TEXT, -- If yes, describe
                
                -- Contact Info
                student_mobile VARCHAR(20),
                email VARCHAR(100),
                current_address TEXT,
                permanent_address TEXT,
                city VARCHAR(100),
                
                -- Parents Info
                father_name VARCHAR(100),
                father_phone VARCHAR(20),
                father_cnic VARCHAR(50),
                father_occupation VARCHAR(100),
                
                mother_name VARCHAR(100),
                mother_phone VARCHAR(20),
                mother_cnic VARCHAR(50),
                mother_occupation VARCHAR(100),
                
                -- Guardian Info (For orphans or alternate care)
                is_orphan BOOLEAN DEFAULT FALSE,
                guardian_name VARCHAR(100),
                guardian_relation VARCHAR(50), -- Uncle, Aunt, Grandparent
                guardian_phone VARCHAR(20),
                guardian_cnic VARCHAR(50),
                guardian_address TEXT,
                
                -- Fee Structure (Initial Setup)
                monthly_fee NUMERIC(10, 2) DEFAULT 0.00,
                admission_fee NUMERIC(10, 2) DEFAULT 0.00,
                other_charges NUMERIC(10, 2) DEFAULT 0.00,

                image_url TEXT,
                documents TEXT, -- JSON string of file paths
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        console.log("Students Table Updated Successfully with Comprehensive Schema.");
    } catch (err) {
        console.error("Error creating students table:", err.message);
    }
};

updateStudentsTableComprehensive();