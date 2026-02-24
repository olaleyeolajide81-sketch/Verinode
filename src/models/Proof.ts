export interface Proof {
  id: string;
  issuer: string;
  eventData: any;
  hash: string;
  timestamp: string;
  verified: boolean;
  verifiedAt?: string;
  stellarTxId?: string;
  userId: string;
  version: number;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  metadata?: Record<string, any>;
  expiresAt?: string;
}

export interface ProofCreationRequest {
  eventData: any;
  hash: string;
  issuerAddress: string;
  userId: string;
  metadata?: Record<string, any>;
  expiresAt?: string;
}

export interface ProofVerificationRequest {
  proofId: string;
  verificationMethod: 'stellar' | 'hash' | 'both';
}

export interface BatchProofOperation {
  operation: 'verify' | 'delete' | 'update';
  proofIds: string[];
  data?: any;
}

export interface ProofQuery {
  userId?: string;
  issuer?: string;
  verified?: boolean;
  status?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'verifiedAt';
  sortOrder?: 'asc' | 'desc';
}
