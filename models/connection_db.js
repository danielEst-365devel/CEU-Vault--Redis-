const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    database: "tlts_system"
});

const connectDatabase = async () => {
    try {
        await db.getConnection();
        console.log("Database is connected successfully.");
    } catch (error) {
        console.log("Database connection has an error.", error);
    }
};

module.exports = {
    db,
    connectDatabase
};

/* For Vercel PostgreSQL
const { Pool } = require('pg');

const db = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DATABASE,
    password: process.env.POSTGRES_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    }
});

const connectDatabase = async () => {
    try {
        const client = await db.connect();
        console.log("Database is connected successfully.");
        client.release();
    } catch (error) {
        console.log("Database connection has an error.", error);
    }
};

module.exports = {
    db,
    connectDatabase
};

*/