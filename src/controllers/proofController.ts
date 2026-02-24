import { Request, Response } from 'express';
import { ProofService } from '../services/proofService';
import { ApiResponse } from '../utils/apiResponse';
import { ProofCreationRequest, ProofVerificationRequest, BatchProofOperation, ProofQuery } from '../models/Proof';

export class ProofController {
  private proofService: ProofService;

  constructor() {
    this.proofService = new ProofService();
  }

  createProof = async (req: Request, res: Response) => {
    try {
      const proofRequest: ProofCreationRequest = req.body;
      const proof = await this.proofService.createProof(proofRequest);
      
      res.status(201).json(
        ApiResponse.success(proof, 'Proof created successfully')
      );
    } catch (error) {
      res.status(400).json(
        ApiResponse.error(error.message, 400)
      );
    }
  };

  verifyProof = async (req: Request, res: Response) => {
    try {
      const { proofId } = req.params;
      const { verificationMethod } = req.body;
      
      const proof = await this.proofService.verifyProof(proofId, verificationMethod);
      
      res.json(
        ApiResponse.success(proof, 'Proof verified successfully')
      );
    } catch (error) {
      res.status(400).json(
        ApiResponse.error(error.message, 400)
      );
    }
  };

  getProofById = async (req: Request, res: Response) => {
    try {
      const { proofId } = req.params;
      const proof = await this.proofService.getProofById(proofId);
      
      if (!proof) {
        return res.status(404).json(
          ApiResponse.error('Proof not found', 404)
        );
      }
      
      res.json(
        ApiResponse.success(proof)
      );
    } catch (error) {
      res.status(500).json(
        ApiResponse.error(error.message, 500)
      );
    }
  };

  getUserProofs = async (req: Request, res: Response) => {
    try {
      const query: ProofQuery = {
        userId: req.query.userId as string,
        issuer: req.query.issuer as string,
        verified: req.query.verified === 'true',
        status: req.query.status as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        sortBy: req.query.sortBy as 'timestamp' | 'verifiedAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const { proofs, total } = await this.proofService.getUserProofs(query);
      const page = Math.floor((query.offset || 0) / (query.limit || 20)) + 1;
      const limit = query.limit || 20;
      
      res.json(
        ApiResponse.paginated(proofs, total, page, limit)
      );
    } catch (error) {
      res.status(500).json(
        ApiResponse.error(error.message, 500)
      );
    }
  };

  performBatchOperation = async (req: Request, res: Response) => {
    try {
      const operation: BatchProofOperation = req.body;
      const result = await this.proofService.performBatchOperation(operation);
      
      res.json(
        ApiResponse.success(result, 'Batch operation completed')
      );
    } catch (error) {
      res.status(400).json(
        ApiResponse.error(error.message, 400)
      );
    }
  };

  getProofStats = async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      const stats = await this.proofService.getProofStats(userId);
      
      res.json(
        ApiResponse.success(stats)
      );
    } catch (error) {
      res.status(500).json(
        ApiResponse.error(error.message, 500)
      );
    }
  };

  deleteProof = async (req: Request, res: Response) => {
    try {
      const { proofId } = req.params;
      const operation: BatchProofOperation = {
        operation: 'delete',
        proofIds: [proofId]
      };
      
      const result = await this.proofService.performBatchOperation(operation);
      
      if (result.success.length === 0) {
        return res.status(404).json(
          ApiResponse.error('Proof not found', 404)
        );
      }
      
      res.json(
        ApiResponse.success(null, 'Proof deleted successfully')
      );
    } catch (error) {
      res.status(500).json(
        ApiResponse.error(error.message, 500)
      );
    }
  };

  updateProof = async (req: Request, res: Response) => {
    try {
      const { proofId } = req.params;
      const updateData = req.body;
      
      const operation: BatchProofOperation = {
        operation: 'update',
        proofIds: [proofId],
        data: updateData
      };
      
      const result = await this.proofService.performBatchOperation(operation);
      
      if (result.success.length === 0) {
        return res.status(404).json(
          ApiResponse.error('Proof not found', 404)
        );
      }
      
      const updatedProof = await this.proofService.getProofById(proofId);
      
      res.json(
        ApiResponse.success(updatedProof, 'Proof updated successfully')
      );
    } catch (error) {
      res.status(400).json(
        ApiResponse.error(error.message, 400)
      );
    }
  };
}
