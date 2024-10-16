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