const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '', // Default XAMPP password
    multipleStatements: true
};

const schema = `
  CREATE DATABASE IF NOT EXISTS weather_app_db;
  USE weather_app_db;

  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    avatar_color VARCHAR(50) DEFAULT '#ccc'
  );

  CREATE TABLE IF NOT EXISTS polls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    creator_id INT NOT NULL,
    question VARCHAR(255) NOT NULL,
    weather_context VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS poll_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poll_id INT NOT NULL,
    text VARCHAR(255) NOT NULL,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poll_id INT NOT NULL,
    user_id INT NOT NULL,
    option_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vote (poll_id, user_id) -- Enforces One Vote Per User
  );
`;

const seedUsers = `
  INSERT INTO users (name, avatar_color) VALUES 
  ('Ali', '#FF5733'),
  ('Zara', '#33FF57'),
  ('Bilal', '#3357FF'),
  ('Fatima', '#FF33A1'),
  ('Omar', '#A133FF'),
  ('Ayesha', '#FF8C33'),
  ('Usman', '#33FFF5'),
  ('Hina', '#8C33FF'),
  ('Ahmed', '#FF3333')
  ON DUPLICATE KEY UPDATE name=name;
`;

async function initDB() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL...');

        await connection.query(schema);
        console.log('Database and Tables created.');

        // Seed Users if empty
        // To be simple, we just try to run seed. If names clash it might error or just add duplicates if we didn't add unique constraint on name.
        // Let's first check if users exist
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM users');
        if (rows[0].count === 0) {
            await connection.query(seedUsers);
            console.log('Seeded 9 Users.');
        } else {
            console.log('Users already exist, skipping seed.');
        }

        await connection.end();
        console.log('Initialization Complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error initializing DB:', err);
        process.exit(1);
    }
}

initDB();
