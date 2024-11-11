// Naka online na redis server. Need internet connection to connect to the server.
// Eliminates the need for Windows Subsystem for Linux.
// Use this for production and testing.
const { createClient } = require('redis');
require('dotenv').config();

const client = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: 'redis-17317.c292.ap-southeast-1-1.ec2.redns.redis-cloud.com',
        port: 17317
    }
});

client.on('connect', () => {
    console.log('Connected to Redis');
});

client.on('error', (err) => {
    console.error('Redis client error:', err);
});

client.connect().catch(console.error);

module.exports = client;

/* Use this muna for local development. May 5gb quota per month ang network cap nung free tier nung redis. 
const redis = require('redis');
const client = redis.createClient({
  url: 'redis://127.0.0.1:6379'
});

client.on('connect', () => {
  console.log('Redis client connected');
});

client.on('error', (err) => {
  console.error('Redis client error:', err);
});

client.connect().catch(console.error); // Ensure the client connects

module.exports = client;

//For local redis server. Needs Windows Subsystem for Linux para gumana.
*/ 

