import redis from './redis.js';

const rollingLimitScript = `
  redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1] - ARGV[2])
  local count = redis.call('ZCARD', KEYS[1])
  if count >= tonumber(ARGV[3]) then
      return 0
  end
  redis.call('ZADD', KEYS[1], ARGV[1], ARGV[1] .. '-' .. ARGV[4])
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
  return 1
`;

export async function checkOtpSendLimits(phone, ip) {
  if (!redis || redis.status !== 'ready') return; // Fail-open if Redis is down locally

  const now = Date.now();
  const nonce = Math.random().toString(36).substring(2, 10);

  try {
    // 1. IP Limit: 10 per 15 mins
    const ipKey = `rl:ip:send:${ip}`;
    const ipAllowed = await redis.eval(rollingLimitScript, 1, ipKey, now, 15 * 60 * 1000, 10, nonce);
    if (!ipAllowed) throwLimitError('Too many requests from this IP.', 429);

    // 2. Cooldown Limit: 30 seconds
    const cdKey = `rl:otp:cd:${phone}`;
    const cdAllowed = await redis.eval(rollingLimitScript, 1, cdKey, now, 30 * 1000, 1, nonce);
    if (!cdAllowed) throwLimitError('Please wait 30 seconds before requesting another OTP.', 429);

    // 3. 15-Minute Limit: 3 per 15 mins
    const m15Key = `rl:otp:15m:${phone}`;
    const m15Allowed = await redis.eval(rollingLimitScript, 1, m15Key, now, 15 * 60 * 1000, 3, nonce);
    if (!m15Allowed) throwLimitError('Too many OTP requests. Please try again after 15 minutes.', 429);

    // 4. 24-Hour Limit: 5 per 24 hours
    const h24Key = `rl:otp:24h:${phone}`;
    const h24Allowed = await redis.eval(rollingLimitScript, 1, h24Key, now, 24 * 60 * 60 * 1000, 5, nonce);
    if (!h24Allowed) throwLimitError('Daily OTP request limit reached. Try again tomorrow.', 429);
  } catch (err) {
    if (err.code === 'RATE_LIMIT_EXCEEDED') throw err;
    console.warn('[REDIS] checkOtpSendLimits failed, bypassing rate limit.', err.message);
  }
}

export async function checkVerifyLimits(phone) {
  if (!redis || redis.status !== 'ready') return;
  try {
    const fails = await redis.get(`rl:otp:fails:${phone}`);
    if (fails && parseInt(fails, 10) >= 5) {
      throwLimitError('Too many incorrect attempts. Please wait 15 minutes before trying again.', 429);
    }
  } catch (err) {
    if (err.code === 'RATE_LIMIT_EXCEEDED') throw err;
    console.warn('[REDIS] checkVerifyLimits failed, bypassing.', err.message);
  }
}

export async function recordVerifyFailure(phone) {
  if (!redis || redis.status !== 'ready') return;
  try {
    const key = `rl:otp:fails:${phone}`;
    const fails = await redis.incr(key);
    if (fails === 1) {
      await redis.expire(key, 15 * 60); // 15 mins
    }
  } catch (err) {
    console.warn('[REDIS] recordVerifyFailure failed, bypassing.', err.message);
  }
}

export async function clearVerifyFailures(phone) {
  if (!redis || redis.status !== 'ready') return;
  try {
    await redis.del(`rl:otp:fails:${phone}`);
  } catch (err) {
    console.warn('[REDIS] clearVerifyFailures failed, bypassing.', err.message);
  }
}

function throwLimitError(message, code) {
  const error = new Error(message);
  error.code = 'RATE_LIMIT_EXCEEDED';
  throw error;
}
