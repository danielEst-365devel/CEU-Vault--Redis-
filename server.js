const HTTP = require('http');
const app = require('./app');
const port = 8000;
const server = HTTP.createServer(app);

server.listen(port, () => {
    console.log(`Server is all up in port ${port}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
        process.exit(1);
    } else {
        throw err;
    }
});