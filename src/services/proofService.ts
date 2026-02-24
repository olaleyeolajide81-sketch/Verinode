import { Proof, ProofCreationRequest, ProofVerificationRequest, BatchProofOperation, ProofQuery } from '../models/Proof';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import StellarSDK from '@stellar/stellar-sdk';

export class ProofService {
  private proofs: Map<string, Proof> = new Map();
  private stellarServer: StellarSDK.Horizon.Server;

  constructor() {
    this.stellarServer = new StellarSDK.Horizon.Server(
      process.env.STELLAR_NETWORK === 'testnet' 
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org'
    );
  }

  async createProof(request: ProofCreationRequest): Promise<Proof> {
    const proof: Proof = {
      id: uuidv4(),
      issuer: request.issuerAddress,
      eventData: request.eventData,
      hash: request.hash,
      timestamp: new Date().toISOString(),
      verified: false,
      userId: request.userId,
      version: 1,
      status: 'pending',
      metadata: request.metadata,
      expiresAt: request.expiresAt
    };

    // Validate hash integrity
    const computedHash = crypto.createHash('sha256').update(JSON.stringify(request.eventData)).digest('hex');
    if (computedHash !== request.hash) {
      throw new Error('Hash does not match event data');
    }

    this.proofs.set(proof.id, proof);
    return proof;
  }

  async verifyProof(proofId: string, verificationMethod: 'stellar' | 'hash' | 'both' = 'both'): Promise<Proof> {
    const proof = this.proofs.get(proofId);
    if (!proof) {
      throw new Error('Proof not found');
    }

    if (proof.verified) {
      return proof;
    }

    // Check if proof has expired
    if (proof.expiresAt && new Date(proof.expiresAt) < new Date()) {
      proof.status = 'expired';
      throw new Error('Proof has expired');
    }

    let isValid = false;

    if (verificationMethod === 'hash' || verificationMethod === 'both') {
      // Verify hash integrity
      const computedHash = crypto.createHash('sha256').update(JSON.stringify(proof.eventData)).digest('hex');
      isValid = computedHash === proof.hash;
    }

    if (verificationMethod === 'stellar' || verificationMethod === 'both') {
      // Verify on Stellar blockchain (mock implementation)
      try {
        // In a real implementation, this would verify the transaction on Stellar
        // For now, we'll simulate verification
        isValid = isValid && await this.verifyStellarTransaction(proof);
      } catch (error) {
        throw new Error(`Stellar verification failed: ${error.message}`);
      }
    }

    if (isValid) {
      proof.verified = true;
      proof.verifiedAt = new Date().toISOString();
      proof.status = 'verified';
      
      // Create Stellar transaction record
      try {
        proof.stellarTxId = await this.createStellarTransaction(proof);
      } catch (error) {
        console.warn('Failed to create Stellar transaction:', error.message);
      }
    } else {
      proof.status = 'rejected';
      throw new Error('Proof verification failed');
    }

    this.proofs.set(proofId, proof);
    return proof;
  }

  async getProofById(proofId: string): Promise<Proof | null> {
    const proof = this.proofs.get(proofId);
    
    // Check if proof has expired
    if (proof && proof.expiresAt && new Date(proof.expiresAt) < new Date()) {
      proof.status = 'expired';
      this.proofs.set(proofId, proof);
    }
    
    return proof || null;
  }

  async getUserProofs(query: ProofQuery): Promise<{ proofs: Proof[], total: number }> {
    let proofs = Array.from(this.proofs.values());

    // Apply filters
    if (query.userId) {
      proofs = proofs.filter(p => p.userId === query.userId);
    }

    if (query.issuer) {
      proofs = proofs.filter(p => p.issuer === query.issuer);
    }

    if (query.verified !== undefined) {
      proofs = proofs.filter(p => p.verified === query.verified);
    }

    if (query.status) {
      proofs = proofs.filter(p => p.status === query.status);
    }

    // Sort
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';
    proofs.sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      return sortOrder === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });

    const total = proofs.length;

    // Apply pagination
    const limit = query.limit || 20;
    const offset = query.offset || 0;
    proofs = proofs.slice(offset, offset + limit);

    return { proofs, total };
  }

  async performBatchOperation(operation: BatchProofOperation): Promise<{ success: string[], failed: { id: string, error: string }[] }> {
    const success: string[] = [];
    const failed: { id: string, error: string }[] = [];

    for (const proofId of operation.proofIds) {
      try {
        switch (operation.operation) {
          case 'verify':
            await this.verifyProof(proofId);
            success.push(proofId);
            break;
          
          case 'delete':
            if (this.proofs.has(proofId)) {
              this.proofs.delete(proofId);
              success.push(proofId);
            } else {
              failed.push({ id: proofId, error: 'Proof not found' });
            }
            break;
          
          case 'update':
            const proof = this.proofs.get(proofId);
            if (proof && operation.data) {
              Object.assign(proof, operation.data);
              proof.version += 1;
              proof.timestamp = new Date().toISOString();
              this.proofs.set(proofId, proof);
              success.push(proofId);
            } else {
              failed.push({ id: proofId, error: 'Proof not found or no data provided' });
            }
            break;
        }
      } catch (error) {
        failed.push({ id: proofId, error: error.message });
      }
    }

    return { success, failed };
  }

  private async verifyStellarTransaction(proof: Proof): Promise<boolean> {
    // Mock Stellar verification
    // In a real implementation, this would verify the transaction on the Stellar network
    return true;
  }

  private async createStellarTransaction(proof: Proof): Promise<string> {
    // Mock Stellar transaction creation
    // In a real implementation, this would create and submit a transaction to Stellar
    return `stellar-tx-${uuidv4()}`;
  }

  async getProofStats(userId?: string): Promise<{
    total: number;
    verified: number;
    pending: number;
    rejected: number;
    expired: number;
  }> {
    let proofs = Array.from(this.proofs.values());
    
    if (userId) {
      proofs = proofs.filter(p => p.userId === userId);
    }

    return {
      total: proofs.length,
      verified: proofs.filter(p => p.status === 'verified').length,
      pending: proofs.filter(p => p.status === 'pending').length,
      rejected: proofs.filter(p => p.status === 'rejected').length,
      expired: proofs.filter(p => p.status === 'expired').length
    };
  }
}
