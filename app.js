const express = require('express');
const app = express();
const morgan = require('morgan');
const session = require('express-session');
const redisStore = require('connect-redis').default; // Import connect-redis
const redisClient = require('./redisClient'); // Import redisClient
const cookieParser = require('cookie-parser'); // for tokens
const cors = require('cors');
require('dotenv').config();
const db = require("./models/connection_db");
db.connectDatabase();
const path = require('path');
const prodRouter = require('./router/public_router')
const adminRouter = require('./router/admin_router')
const { authenticateToken } = require('./controllers/admin_controller');

app.use(cookieParser()); //tokens

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

//setting for body-parser and morgan
app.use(morgan('dev'))
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


const corsOptions = {
    origin: true,
    credentials: true,
    methods: '*',
    allowedHeaders: '*'
};
app.use(cors(corsOptions));

app.use(express.static(path.join(__dirname, 'Public')));

// First, serve the unprotected login page
app.use('/admin/login-page', express.static(path.join(__dirname, 'admin/login-page')));

// Serve admin assets globally (they are just CSS/JS files)
app.use('/admin/assets', express.static(path.join(__dirname, 'admin/assets')));

// Define protected admin paths
const protectedAdminPaths = [
    '/admin/history',
    '/admin/home-page',
    '/admin/inventory-status',
    '/admin/requests'
];

// Protect and serve admin static files
protectedAdminPaths.forEach(adminPath => {
    app.use(adminPath, authenticateToken, express.static(path.join(__dirname, 'admin', adminPath.replace('/admin/', ''))));
});

// Redirect root to home page
app.get('/', (req, res) => {
    res.redirect('/home-page/index.html');
});

// Redirect /admin to login page
app.get('/admin', (req, res) => {
    res.redirect('/admin/login-page');
});

// Your API routes should come after static file serving
app.use('/admin', adminRouter);
app.use('/equipments', prodRouter);


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