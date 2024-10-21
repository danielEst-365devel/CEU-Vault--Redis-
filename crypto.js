const crypto = require('crypto');

// Generate a random secret key
const secretKey = crypto.randomBytes(32).toString('hex'); // 32 bytes for AES-256
console.log('Secret Key:', secretKey);

// Generate a random initialization vector
const iv = crypto.randomBytes(16); // 16 bytes for AES-256-CBC

// Function to encrypt data
const encrypt = (text) => {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

// Function to decrypt data
const decrypt = (encryptedText) => {
  const [ivHex, encrypted] = encryptedText.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), Buffer.from(ivHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Example usage
const textToEncrypt = 'tltsSecretKey';
const encryptedText = encrypt(textToEncrypt);
console.log('Encrypted Text:', encryptedText);

const decryptedText = decrypt(encryptedText);
console.log('Decrypted Text:', decryptedText);

//node crypto.js