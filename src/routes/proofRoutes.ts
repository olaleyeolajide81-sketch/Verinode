import { Router } from 'express';
import { ProofController } from '../controllers/proofController';
import { 
  validateProofCreation, 
  validateProofVerification, 
  validateProofQuery, 
  validateBatchOperation,
  handleValidationErrors 
} from '../middleware/validation';
import { 
  strictRateLimiter, 
  proofCreationLimiter, 
  verificationLimiter, 
  batchOperationLimiter 
} from '../middleware/rateLimiter';

const router = Router();
const proofController = new ProofController();

// Apply strict rate limiting to all proof routes
router.use(strictRateLimiter);

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
  proofController.createProof
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
  proofController.getUserProofs
);

/**
 * @route GET /api/proofs/stats
 * @desc Get proof statistics
 * @access Public
 * @rateLimit 100 requests per 15 minutes
 */
router.get('/stats',
  proofController.getProofStats
);

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
  proofController.performBatchOperation
);

/**
 * @route GET /api/proofs/:proofId
 * @desc Get a specific proof by ID
 * @access Public
 * @rateLimit 100 requests per 15 minutes
 */
router.get('/:proofId',
  proofController.getProofById
);

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
  proofController.verifyProof
);

/**
 * @route PUT /api/proofs/:proofId
 * @desc Update a proof
 * @access Public
 * @rateLimit 50 requests per 15 minutes
 */
router.put('/:proofId',
  proofController.updateProof
);

/**
 * @route DELETE /api/proofs/:proofId
 * @desc Delete a proof
 * @access Public
 * @rateLimit 50 requests per 15 minutes
 */
router.delete('/:proofId',
  proofController.deleteProof
);

export default router;
