const bcrypt = require('bcryptjs');

// Function to hash a password
const hashPassword = async (password) => {
    try {
        // Generate a salt
        const salt = await bcrypt.genSalt(10);
        // Hash the password with the salt
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Error hashing password');
    }
};

// Example usage
(async () => {
    const plainPassword = 'tltsGodz123';
    const hashedPassword = await hashPassword(plainPassword);
    console.log('Hashed Password:', hashedPassword);
})();