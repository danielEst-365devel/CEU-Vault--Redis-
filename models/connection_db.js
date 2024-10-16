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