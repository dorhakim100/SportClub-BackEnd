import rateLimit from 'express-rate-limit'

export function signupLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 signups per IP per window
    standardHeaders: true, // adds RateLimit-* & Retry-After
    legacyHeaders: false,
    message: { err: 'Too many signups from this IP.' },
    keyGenerator: (req) => req.ip, // default; keep explicit
  })
}
