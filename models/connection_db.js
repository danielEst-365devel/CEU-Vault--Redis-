const mysql = require('mysql')

const db = mysql.createConnection({
        host: "localhost",
        user: "root",
        database: "tlts_system"
})

const connectDatabase = ()=>{
    db.connect((error)=>{
        if(error){
            console.log("Database connection has an error.")
        }
        else{
            console.log("Database is connected successfully.")
        }
    })
}

module.exports = {
    db,
    connectDatabase
}