const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'cloud_kitchen',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

/**
 * Tests the database connection.
 * @returns {Promise<void>}
 */
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Successfully connected to the database.');
        connection.release();
    } catch (error) {
        console.error('Failed to connect to the database:', error);
    }
};

module.exports = { pool, testConnection };
