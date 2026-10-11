import Redis from 'ioredis';

// Wrap instantiation in a try-catch pattern or lazily evaluate if Redis is offline
let redisClient = null;

try {
  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 2) {
        console.warn('[REDIS] Connection failed. Rate limiting will bypass.');
        return null; // Stop retrying
      }
      return 1000;
    }
  });

  redisClient.on('error', (err) => {
    // Only log the first error to avoid terminal spam
    if (!redisClient.hasLoggedError) {
      console.warn(`[REDIS] Error: ${err.message}. Ensure Redis server is running.`);
      redisClient.hasLoggedError = true;
    }
  });
} catch (e) {
  console.warn('[REDIS] Initialization failed.');
}

export default redisClient;
