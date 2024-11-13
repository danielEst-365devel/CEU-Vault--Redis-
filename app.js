const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const redisStore = require('connect-redis').default; // Import connect-redis
const redisClient = require('./redisClient'); // Import redisClient
const cookieParser = require('cookie-parser'); // for tokens
const cors = require('cors');
require('dotenv').config();
const db = require("./models/connection_db");
db.connectDatabase();
const prodRouter = require('./router/backend_router')

app.use(cookieParser()); //tokens

app.use('/equipments', prodRouter);

// Trust first proxy
app.set('trust proxy', 1);

app.use(session({
    store: new redisStore({ client: redisClient }),
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: true, // Ensure the cookie is only used over HTTPS
        httpOnly: true, 
        maxAge: 120000, 
        sameSite: 'None' // Add SameSite=None attribute
    }
}));

// routers

//setting for body-parser and morgan
app.use(morgan('dev'))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

//headers

const allowedOrigins = [
    'https://127.0.0.1:6379',
    'https://127.0.0.1:5500',
    'https://127.0.0.1:8000',
    process.env.NGROK_URL
];

const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept']
};

app.use(cors(corsOptions));



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