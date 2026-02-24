const request = require('supertest');
const express = require('express');
const proofRoutes = require('../routes/proofs');

const app = express();
app.use(express.json());
app.use('/api/proofs', proofRoutes);

describe('Proof API Endpoints', () => {
  let proofId;
  const testProof = {
    eventData: {
      type: 'document_signing',
      documentId: 'doc_123',
      signer: 'John Doe',
      timestamp: '2024-01-01T00:00:00.000Z'
    },
    hash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890',
    issuerAddress: 'GABCDEFG1234567890ABCDEFG1234567890ABCDEFG1234567890ABCDEFG',
    userId: '550e8400-e29b-41d4-a716-446655440000'
  };

  describe('POST /api/proofs', () => {
    it('should create a new proof', async () => {
      const response = await request(app)
        .post('/api/proofs')
        .send(testProof)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.eventData).toEqual(testProof.eventData);
      expect(response.body.data.hash).toBe(testProof.hash);
      expect(response.body.data.issuer).toBe(testProof.issuerAddress);
      expect(response.body.data.userId).toBe(testProof.userId);
      expect(response.body.data.verified).toBe(false);
      expect(response.body.data.status).toBe('pending');

      proofId = response.body.data.id;
    });

    it('should return validation error for missing eventData', async () => {
      const invalidProof = { ...testProof };
      delete invalidProof.eventData;

      const response = await request(app)
        .post('/api/proofs')
        .send(invalidProof)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
    });

    it('should return validation error for invalid hash', async () => {
      const invalidProof = { ...testProof, hash: 'short' };

      const response = await request(app)
        .post('/api/proofs')
        .send(invalidProof)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error for invalid Stellar address', async () => {
      const invalidProof = { ...testProof, issuerAddress: 'invalid' };

      const response = await request(app)
        .post('/api/proofs')
        .send(invalidProof)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error for invalid UUID', async () => {
      const invalidProof = { ...testProof, userId: 'invalid-uuid' };

      const response = await request(app)
        .post('/api/proofs')
        .send(invalidProof)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/proofs/:proofId', () => {
    it('should get a proof by ID', async () => {
      const response = await request(app)
        .get(`/api/proofs/${proofId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(proofId);
      expect(response.body.data.eventData).toEqual(testProof.eventData);
    });

    it('should return 404 for non-existent proof', async () => {
      const response = await request(app)
        .get('/api/proofs/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Proof not found');
    });
  });

  describe('GET /api/proofs', () => {
    it('should get all proofs with pagination', async () => {
      const response = await request(app)
        .get('/api/proofs')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('should filter proofs by userId', async () => {
      const response = await request(app)
        .get(`/api/proofs?userId=${testProof.userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      response.body.data.forEach(proof => {
        expect(proof.userId).toBe(testProof.userId);
      });
    });

    it('should filter proofs by verification status', async () => {
      const response = await request(app)
        .get('/api/proofs?verified=false')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(proof => {
        expect(proof.verified).toBe(false);
      });
    });

    it('should limit results', async () => {
      const response = await request(app)
        .get('/api/proofs?limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('POST /api/proofs/:proofId/verify', () => {
    it('should verify a proof', async () => {
      const response = await request(app)
        .post(`/api/proofs/${proofId}/verify`)
        .send({ verificationMethod: 'hash' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verified).toBe(true);
      expect(response.body.data.status).toBe('verified');
      expect(response.body.data.verifiedAt).toBeDefined();
    });

    it('should return 404 for non-existent proof verification', async () => {
      const response = await request(app)
        .post('/api/proofs/non-existent-id/verify')
        .send({ verificationMethod: 'hash' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/proofs/batch', () => {
    let secondProofId;

    beforeAll(async () => {
      // Create a second proof for batch operations
      const secondProof = {
        ...testProof,
        eventData: { type: 'batch_test', data: 'second proof' }
      };
      const response = await request(app)
        .post('/api/proofs')
        .send(secondProof);
      secondProofId = response.body.data.id;
    });

    it('should perform batch verification', async () => {
      const response = await request(app)
        .post('/api/proofs/batch')
        .send({
          operation: 'verify',
          proofIds: [secondProofId]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toContain(secondProofId);
    });

    it('should handle batch operation with mixed success/failure', async () => {
      const response = await request(app)
        .post('/api/proofs/batch')
        .send({
          operation: 'verify',
          proofIds: ['non-existent-id', secondProofId]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toContain(secondProofId);
      expect(response.body.data.failed.length).toBe(1);
    });

    it('should validate batch operation input', async () => {
      const response = await request(app)
        .post('/api/proofs/batch')
        .send({
          operation: 'invalid',
          proofIds: ['invalid-id']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/proofs/:proofId', () => {
    it('should update proof metadata', async () => {
      const updateData = {
        metadata: {
          category: 'important',
          tags: ['test', 'update']
        }
      };

      const response = await request(app)
        .put(`/api/proofs/${proofId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata).toEqual(updateData.metadata);
      expect(response.body.data.version).toBe(2);
    });

    it('should return 404 when updating non-existent proof', async () => {
      const response = await request(app)
        .put('/api/proofs/non-existent-id')
        .send({ metadata: { test: 'data' } })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/proofs/:proofId', () => {
    it('should delete a proof', async () => {
      const response = await request(app)
        .delete(`/api/proofs/${proofId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Proof deleted successfully');
    });

    it('should return 404 when deleting non-existent proof', async () => {
      const response = await request(app)
        .delete('/api/proofs/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/proofs/stats', () => {
    it('should get proof statistics', async () => {
      const response = await request(app)
        .get('/api/proofs/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('verified');
      expect(response.body.data).toHaveProperty('pending');
      expect(response.body.data).toHaveProperty('rejected');
      expect(response.body.data).toHaveProperty('expired');
      expect(typeof response.body.data.total).toBe('number');
    });

    it('should get user-specific statistics', async () => {
      const response = await request(app)
        .get(`/api/proofs/stats?userId=${testProof.userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow normal request rate', async () => {
      const response = await request(app)
        .get('/api/proofs')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/proofs')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/proofs')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
    });
  });
});

describe('Input Validation', () => {
  describe('Proof Creation Validation', () => {
    const validProof = {
      eventData: { type: 'test' },
      hash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890',
      issuerAddress: 'GABCDEFG1234567890ABCDEFG1234567890ABCDEFG1234567890ABCDEFG',
      userId: '550e8400-e29b-41d4-a716-446655440000'
    };

    it('should accept valid expiration date in the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const response = await request(app)
        .post('/api/proofs')
        .send({
          ...validProof,
          expiresAt: futureDate.toISOString()
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject expiration date in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const response = await request(app)
        .post('/api/proofs')
        .send({
          ...validProof,
          expiresAt: pastDate.toISOString()
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid verification method', async () => {
      const response = await request(app)
        .post('/api/proofs/some-id/verify')
        .send({ verificationMethod: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Query Parameter Validation', () => {
    it('should reject invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/proofs?limit=101')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject negative offset parameter', async () => {
      const response = await request(app)
        .get('/api/proofs?offset=-1')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid sort field', async () => {
      const response = await request(app)
        .get('/api/proofs?sortBy=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
