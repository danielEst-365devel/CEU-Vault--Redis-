const HTTPS = require('https');
const fs = require('fs');
const forge = require('node-forge');
const app = require('./app');
const port = 8000;

// Read SSL certificate files
const privateKey = fs.readFileSync('./OpenSSL/privateKey.key', 'utf8');
const certificate = fs.readFileSync('./OpenSSL/certificate.crt', 'utf8');

// Parse the certificate
const cert = forge.pki.certificateFromPem(certificate);

// Extract and log the issuer details
const issuer = cert.issuer.attributes.map(attr => `${attr.name}=${attr.value}`).join(', ');
console.log('Certificate Issuer:', issuer);

const credentials = { key: privateKey, cert: certificate };

// Create HTTPS server
const server = HTTPS.createServer(credentials, app);



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