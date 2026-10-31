const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function initDB() {
    console.log("⚡ Starting Cloud Kitchen Database Initialization...");
    
    // Connect without database selected first
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        multipleStatements: true
    });

    const sqlFiles = [
        '01_schema.sql',
        '02_seed_data.sql',
        '03_stored_procedures.sql',
        '04_triggers.sql',
        '05_views.sql',
        '09_multi_kitchen_expansion.sql',
        '10_multi_kitchen_seed.sql'
    ];

    for (const fileName of sqlFiles) {
        const filePath = path.join(__dirname, '../database', fileName);
        console.log(`📄 Executing ${fileName}...`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await connection.query(sql);
        console.log(`✅ ${fileName} executed successfully.`);
    }

    console.log("🎉 Database initialization completed successfully!");
    await connection.end();
}

initDB().catch(err => {
    console.error("❌ Database initialization failed:", err.message);
    process.exit(1);
});
