import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

// Securely load the connection string from the .env file
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Bulletproof Pool Configuration
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // return an error after 5 seconds if connection could not be established
});

// Listen for unexpected errors on idle clients to prevent the app from crashing silently
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle database client', err);
});

// A robust query wrapper with error handling and performance tracking
export const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error('Database query error ->', { text, error: error.message });
    throw error;
  }
};

// A utility function to test the database connection on server startup
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL Database');
    client.release();
    return true;
  } catch (err) {
    console.error('\\n❌ CRITICAL: Failed to connect to PostgreSQL Database!');
    console.error('Reason:', err.message);
    console.error('👉 ACTION REQUIRED: Open D:/MyApplication/backend/.env and change \"your_actual_password\" to your real PostgreSQL password.\\n');
    return false;
  }
};
