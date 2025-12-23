const { Client } = require('pg');

// Configuration for default postgres connection
const defaultClient = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'password', // Try 'password' first, if fails user might need to adjust
    port: 5432,
});

const dbName = 'weather_logs_db';

const createDb = async () => {
    try {
        await defaultClient.connect();
        // Check if DB exists
        const res = await defaultClient.query(`SELECT 1 FROM pg_database WHERE datname='${dbName}'`);
        if (res.rowCount === 0) {
            await defaultClient.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database ${dbName} created.`);
        } else {
            console.log(`Database ${dbName} already exists.`);
        }
        await defaultClient.end();

        // Connect to the new DB
        const weatherClient = new Client({
            user: 'postgres',
            host: 'localhost',
            database: dbName,
            password: 'password',
            port: 5432,
        });

        await weatherClient.connect();

        // Create Audit Logs Table
        // We store metadata as JSONB for flexibility
        // row_hash will store the SHA-256 hash
        await weatherClient.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        user_id INT, -- Can be null for anonymous actions
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255),
        row_hash VARCHAR(64) NOT NULL
      );
    `);
        console.log("Table 'audit_logs' created/verified.");

        await weatherClient.end();
    } catch (err) {
        console.error("Error initializing Postgres:", err);
        // If password failure, notify user
        if (err.code === '28P01') {
            console.error("Authentication failed. Please check your Postgres password in pg_init.js");
        }
    }
};

createDb();
