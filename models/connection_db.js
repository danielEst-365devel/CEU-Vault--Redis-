require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DATABASE,
    password: process.env.POSTGRES_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    },
    timezone: 'Asia/Manila',
    sessionConfig: {
        timezone: 'Asia/Manila'
    }
});

// Add timezone setting for each new client
pool.on('connect', (client) => {
    client.query('SET timezone = "Asia/Manila"');
});

const connectDatabase = async () => {
    try {
        const client = await pool.connect();
        console.log("Database is connected successfully.");
        client.release();
    } catch (error) {
        console.log("Database connection has an error.", error);
    }
};

module.exports = {
    db: pool,
    connectDatabase
};
