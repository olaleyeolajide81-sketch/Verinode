import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { ProofService } from '../../src/services/proofService';
import { ApiResponse } from '../../src/utils/apiResponse';

const router = express.Router();
const proofService = new ProofService();

// Rate limiting configurations
const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: {
      message: 'Rate limit exceeded. Please try again later.',
      statusCode: 429,
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

const proofCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    error: {
      message: 'Proof creation rate limit exceeded. Please wait before creating more proofs.',
      statusCode: 429,
      timestamp: new Date().toISOString()
    }
  }
});

const verificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    error: {
      message: 'Verification rate limit exceeded. Please wait before making more requests.',
      statusCode: 429,
      timestamp: new Date().toISOString()
    }
  }
});

const batchOperationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  message: {
    success: false,
    error: {
      message: 'Batch operation rate limit exceeded. Please wait before performing more batch operations.',
      statusCode: 429,
      timestamp: new Date().toISOString()
    }
  }
});

// Apply strict rate limiting to all proof routes
router.use(strictRateLimiter);

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        statusCode: 400,
        errors: errors.array(),
        timestamp: new Date().toISOString()
      }
    });
  }
  next();
};

// Create proof validation
const validateProofCreation = [
  body('eventData')
    .notEmpty()
    .withMessage('Event data is required')
    .isObject()
    .withMessage('Event data must be an object'),
  
  body('hash')
    .isLength({ min: 64, max: 128 })
    .withMessage('Hash must be between 64 and 128 characters')
    .isHexadecimal()
    .withMessage('Hash must be hexadecimal'),
  
  body('issuerAddress')
    .notEmpty()
    .withMessage('Issuer address is required')
    .isLength({ min: 56, max: 56 })
    .withMessage('Invalid Stellar address format'),
  
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expires at must be a valid ISO 8601 date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }
      return true;
    })
];

// Verify proof validation
const validateProofVerification = [
  param('proofId')
    .notEmpty()
    .withMessage('Proof ID is required')
    .isUUID()
    .withMessage('Proof ID must be a valid UUID'),
  
  body('verificationMethod')
    .optional()
    .isIn(['stellar', 'hash', 'both'])
    .withMessage('Verification method must be stellar, hash, or both')
];

// Proof query validation
const validateProofQuery = [
  query('userId')
    .optional()
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  
  query('issuer')
    .optional()
    .isLength({ min: 56, max: 56 })
    .withMessage('Invalid Stellar address format'),
  
  query('verified')
    .optional()
    .isBoolean()
    .withMessage('Verified must be a boolean'),
  
  query('status')
    .optional()
    .isIn(['pending', 'verified', 'rejected', 'expired'])
    .withMessage('Status must be pending, verified, rejected, or expired'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  
  query('sortBy')
    .optional()
    .isIn(['timestamp', 'verifiedAt'])
    .withMessage('Sort by must be timestamp or verifiedAt'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Batch operation validation
const validateBatchOperation = [
  body('operation')
    .notEmpty()
    .withMessage('Operation is required')
    .isIn(['verify', 'delete', 'update'])
    .withMessage('Operation must be verify, delete, or update'),
  
  body('proofIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('Proof IDs must be an array with 1-50 items'),
  
  body('proofIds.*')
    .isUUID()
    .withMessage('All proof IDs must be valid UUIDs'),
  
  body('data')
    .optional()
    .isObject()
    .withMessage('Data must be an object')
];

// Routes

/**
 * @route POST /api/proofs
 * @desc Create a new proof
 * @access Public
 * @rateLimit 10 requests per minute
 */
router.post('/',
  proofCreationLimiter,
  validateProofCreation,
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const proofRequest = req.body;
      const proof = await proofService.createProof(proofRequest);
      
      res.status(201).json({
        success: true,
        data: proof,
        message: 'Proof created successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * @route GET /api/proofs
 * @desc Get proofs with filtering and pagination
 * @access Public
 * @rateLimit 100 requests per 15 minutes
 */
router.get('/',
  validateProofQuery,
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const query = {
        userId: req.query.userId as string,
        issuer: req.query.issuer as string,
        verified: req.query.verified === 'true',
        status: req.query.status as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        sortBy: req.query.sortBy as 'timestamp' | 'verifiedAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const { proofs, total } = await proofService.getUserProofs(query);
      const page = Math.floor((query.offset || 0) / (query.limit || 20)) + 1;
      const limit = query.limit || 20;
      
      res.json({
        success: true,
        data: proofs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * @route GET /api/proofs/stats
 * @desc Get proof statistics
 * @access Public
 * @rateLimit 100 requests per 15 minutes
 */
router.get('/stats', async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.query.userId as string;
    const stats = await proofService.getProofStats(userId);
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * @route POST /api/proofs/batch
 * @desc Perform batch operations on proofs
 * @access Public
 * @rateLimit 5 requests per 5 minutes
 */
router.post('/batch',
  batchOperationLimiter,
  validateBatchOperation,
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const operation = req.body;
      const result = await proofService.performBatchOperation(operation);
      
      res.json({
        success: true,
        data: result,
        message: 'Batch operation completed',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * @route GET /api/proofs/:proofId
 * @desc Get a specific proof by ID
 * @access Public
 * @rateLimit 100 requests per 15 minutes
 */
router.get('/:proofId', async (req: express.Request, res: express.Response) => {
  try {
    const { proofId } = req.params;
    const proof = await proofService.getProofById(proofId);
    
    if (!proof) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Proof not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    res.json({
      success: true,
      data: proof,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * @route POST /api/proofs/:proofId/verify
 * @desc Verify a proof
 * @access Public
 * @rateLimit 30 requests per minute
 */
router.post('/:proofId/verify',
  verificationLimiter,
  validateProofVerification,
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { proofId } = req.params;
      const { verificationMethod } = req.body;
      
      const proof = await proofService.verifyProof(proofId, verificationMethod);
      
      res.json({
        success: true,
        data: proof,
        message: 'Proof verified successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

/**
 * @route PUT /api/proofs/:proofId
 * @desc Update a proof
 * @access Public
 * @rateLimit 50 requests per 15 minutes
 */
router.put('/:proofId', async (req: express.Request, res: express.Response) => {
  try {
    const { proofId } = req.params;
    const updateData = req.body;
    
    const operation = {
      operation: 'update' as const,
      proofIds: [proofId],
      data: updateData
    };
    
    const result = await proofService.performBatchOperation(operation);
    
    if (result.success.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Proof not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const updatedProof = await proofService.getProofById(proofId);
    
    res.json({
      success: true,
      data: updatedProof,
      message: 'Proof updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 400,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * @route DELETE /api/proofs/:proofId
 * @desc Delete a proof
 * @access Public
 * @rateLimit 50 requests per 15 minutes
 */
router.delete('/:proofId', async (req: express.Request, res: express.Response) => {
  try {
    const { proofId } = req.params;
    const operation = {
      operation: 'delete' as const,
      proofIds: [proofId]
    };
    
    const result = await proofService.performBatchOperation(operation);
    
    if (result.success.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Proof not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    res.json({
      success: true,
      data: null,
      message: 'Proof deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;
