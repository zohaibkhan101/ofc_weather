const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'weather_app_db'
};

let pool;

async function initPool() {
    pool = mysql.createPool(dbConfig);
}
initPool();

// --- Middleware: Application Level Security ---
// In a real app, we'd verify JWTs. Here, we trust the 'x-user-id' header 
// but enforce logic like "One Vote Per User" via DB constraints and check existence.
const requireUser = async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized: User ID required' });

    try {
        const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return res.status(403).json({ error: 'Forbidden: Invalid User' });
        req.userId = userId;
        next();
    } catch (err) {
        res.status(500).json({ error: 'Db Error' });
    }
};

// --- Routes ---

// Get All Users (for Login)
app.get('/users', async (req, res) => {
    try {
        const [users] = await pool.query('SELECT * FROM users');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Polls (Read Public)
app.get('/polls', async (req, res) => {
    try {
        // Fetch polls with creator info
        const query = `
      SELECT p.*, u.name as creator_name, u.avatar_color as creator_avatar 
      FROM polls p 
      JOIN users u ON p.creator_id = u.id 
      ORDER BY p.created_at DESC
    `;
        const [polls] = await pool.query(query);

        // Fetch options and vote counts for each poll
        // (N+1 query is okay for this scale, or could use complex join/aggregation)
        for (let poll of polls) {
            const [options] = await pool.query(`
        SELECT po.id, po.text, 
               (SELECT COUNT(*) FROM votes v WHERE v.option_id = po.id) as vote_count
        FROM poll_options po 
        WHERE po.poll_id = ?
      `, [poll.id]);

            poll.options = options;

            // Calculate total votes
            poll.total_votes = options.reduce((sum, opt) => sum + opt.vote_count, 0);

            // Check if current user voted (if user id provided)
            const currentUserId = req.headers['x-user-id'];
            if (currentUserId) {
                const [myVote] = await pool.query('SELECT option_id FROM votes WHERE poll_id = ? AND user_id = ?', [poll.id, currentUserId]);
                poll.user_voted_option_id = myVote.length > 0 ? myVote[0].option_id : null;
            }
        }

        res.json(polls);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Poll (Protected)
app.post('/polls', requireUser, async (req, res) => {
    const { question, options, weather_context } = req.body;
    if (!question || !options || options.length < 2) {
        return res.status(400).json({ error: 'Invalid Poll Data' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            'INSERT INTO polls (creator_id, question, weather_context) VALUES (?, ?, ?)',
            [req.userId, question, weather_context]
        );
        const pollId = result.insertId;

        for (const optionText of options) {
            await connection.query(
                'INSERT INTO poll_options (poll_id, text) VALUES (?, ?)',
                [pollId, optionText]
            );
        }

        await connection.commit();
        res.json({ success: true, pollId });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// Vote (Protected)
app.post('/vote', requireUser, async (req, res) => {
    const { poll_id, option_id } = req.body;

    try {
        await pool.query(
            'INSERT INTO votes (poll_id, user_id, option_id) VALUES (?, ?, ?)',
            [poll_id, req.userId, option_id]
        );
        res.json({ success: true });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ error: 'You have already voted on this poll.' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
