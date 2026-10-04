import rateLimit from "express-rate-limit";

/**
 * Rate limiter for Knowledge QA & Chat endpoints.
 * Configured for 20 questions per minute per user.
 */
export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 20, // max 20 requests per window per user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.user?._id || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "Too Many Requests",
      message: "Rate limit exceeded: Maximum 20 questions per minute per user. Please wait a moment before sending another request.",
      retryAfterSeconds: 60,
    });
  },
});

/**
 * Rate limiter for manual repository sync triggers.
 * Configured for 10 sync triggers per 5 minutes per user/company.
 */
export const syncRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minute window
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.company || req.user?.id || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "Too Many Requests",
      message: "Sync rate limit exceeded: Maximum 10 sync triggers per 5 minutes. Please wait before triggering another sync.",
      retryAfterSeconds: 300,
    });
  },
});

/**
 * Rate limiter for incoming GitHub webhook payloads.
 * Configured for 120 webhook deliveries per minute per IP.
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "Too Many Requests",
      message: "Webhook delivery rate limit exceeded. Please throttle delivery frequency.",
      retryAfterSeconds: 60,
    });
  },
});

