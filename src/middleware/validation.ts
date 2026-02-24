import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ApiResponse } from '../utils/apiResponse';

export const validateProofCreation = [
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

export const validateProofVerification = [
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

export const validateProofQuery = [
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

export const validateBatchOperation = [
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

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(ApiResponse.validationError(errors.array()));
  }
  next();
};
