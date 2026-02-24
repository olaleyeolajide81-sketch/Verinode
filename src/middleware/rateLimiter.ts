import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

export const createRateLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        message: message || `Too many requests. Please try again later.`,
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          message: message || `Too many requests. Please try again later.`,
          statusCode: 429,
          retryAfter: Math.round(windowMs / 1000),
          timestamp: new Date().toISOString()
        }
      });
    }
  });
};

export const strictRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  50, // 50 requests per window
  'Rate limit exceeded. Please wait before making more requests.'
);

export const proofCreationLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  10, // 10 proof creations per minute
  'Proof creation rate limit exceeded. Please wait before creating more proofs.'
);

export const verificationLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  30, // 30 verifications per minute
  'Verification rate limit exceeded. Please wait before making more requests.'
);

export const batchOperationLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  5, // 5 batch operations per 5 minutes
  'Batch operation rate limit exceeded. Please wait before performing more batch operations.'
);
