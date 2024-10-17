const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const redisStore = require('connect-redis').default; // Import connect-redis
const redisClient = require('./redisClient'); // Import redisClient

//db con
const db = require("./models/connection_db");
db.connectDatabase();

// Session middleware configuration
app.use(express.static('public'));

app.use(session({
    store: new redisStore({ client: redisClient }),
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: true, // Ensure the cookie is only used over HTTPS
        httpOnly: true, 
        maxAge: 60000, 
        sameSite: 'None' // Add SameSite=None attribute
    }
}));

// routers
const prodRouter = require('./router/backend_router')
//setting for body-parser and morgan
app.use(morgan('dev'))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

//headers
app.use((req, res, next) => {
    const allowedOrigins = ['https://127.0.0.1:6379', 'https://127.0.0.1:5500'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === 'OPTIONS') {
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
        return res.status(200).json({});
    }
    next();
});

app.use('/equipments', prodRouter)

redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

// Handle Redis connection errors
redisClient.on('error', (err) => {
    console.error('Redis error: ', err);
});

//error middleware
app.use((req, res, next) => {
    const error = new Error('Not Found')
    error.status = 404
    next(error)
})

app.use((error, req, res, next) => {
    res.status(error.status || 500)
    res.json({
        error: {
            message: error.message
        }
    })
})

module.exports = app