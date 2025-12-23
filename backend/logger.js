const { Client } = require('pg');
const crypto = require('crypto');

// DB Config (Make sure this matches pg_init)
const dbConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'weather_logs_db',
    password: 'password', // Ensure this matches your local setup
    port: 5432,
};

const SALT = 'super_secret_tamper_proof_salt_2025';

async function logAudit(action, userId, metadata = {}, actorName = 'SYSTEM') {
    const client = new Client(dbConfig);
    try {
        await client.connect();

        const createdAt = new Date().toISOString();
        const updatedAt = createdAt;

        // Ensure metadata is a string for hashing consistency
        const metadataStr = JSON.stringify(metadata);

        // Create Tamper-Evident Hash
        // Hash includes all critical fields + Salt
        const rowString = `${action}|${userId}|${metadataStr}|${createdAt}|${actorName}|${updatedAt}|${actorName}|${SALT}`;
        const rowHash = crypto.createHash('sha256').update(rowString).digest('hex');

        const query = `
      INSERT INTO audit_logs 
      (action, user_id, metadata, created_at, created_by, updated_at, updated_by, row_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

        const values = [
            action,
            userId,
            metadata,
            createdAt,
            actorName, // created_by
            updatedAt,
            actorName, // updated_by
            rowHash
        ];

        await client.query(query, values);
        // console.log(`[AUDIT] ${action} logged.`);
    } catch (err) {
        console.error("Audit Log Error:", err);
    } finally {
        await client.end();
    }
}

module.exports = { logAudit };
