# Verinode Proof Management API Documentation

## Overview

This API provides comprehensive endpoints for creating, verifying, and managing cryptographic proofs on the Verinode platform. All endpoints include proper validation, rate limiting, and security measures.

## Base URL

```
https://api.verinode.com/api/proofs
```

## Authentication

Currently, the API is public but includes rate limiting. Authentication will be added in future versions.

## Rate Limiting

- **General API**: 100 requests per 15 minutes
- **Proof Creation**: 10 requests per minute
- **Proof Verification**: 30 requests per minute
- **Batch Operations**: 5 requests per 5 minutes

## Response Format

All responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {}, // Response data
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "details": {}, // Optional additional error details
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [], // Array of items
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Endpoints

### 1. Create Proof

**POST** `/api/proofs`

Creates a new cryptographic proof.

#### Request Body
```json
{
  "eventData": {
    "type": "string",
    "data": "any"
  },
  "hash": "64-128 character hexadecimal string",
  "issuerAddress": "56-character Stellar address",
  "userId": "UUID string",
  "metadata": {}, // Optional
  "expiresAt": "ISO 8601 datetime string" // Optional
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "UUID",
    "issuer": "Stellar address",
    "eventData": {},
    "hash": "hexadecimal string",
    "timestamp": "ISO 8601 datetime",
    "verified": false,
    "userId": "UUID",
    "version": 1,
    "status": "pending",
    "metadata": {},
    "expiresAt": "ISO 8601 datetime"
  },
  "message": "Proof created successfully"
}
```

#### Rate Limiting
- 10 requests per minute

#### Example
```bash
curl -X POST https://api.verinode.com/api/proofs \
  -H "Content-Type: application/json" \
  -d '{
    "eventData": {
      "type": "document_signing",
      "documentId": "doc_123",
      "signer": "John Doe"
    },
    "hash": "a1b2c3d4e5f6...",
    "issuerAddress": "GABCDEFG...",
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

### 2. Get Proof by ID

**GET** `/api/proofs/{proofId}`

Retrieves a specific proof by its ID.

#### Parameters
- `proofId` (path): UUID of the proof

#### Response
```json
{
  "success": true,
  "data": {
    "id": "UUID",
    "issuer": "Stellar address",
    "eventData": {},
    "hash": "hexadecimal string",
    "timestamp": "ISO 8601 datetime",
    "verified": true,
    "verifiedAt": "ISO 8601 datetime",
    "stellarTxId": "stellar transaction ID",
    "userId": "UUID",
    "version": 1,
    "status": "verified",
    "metadata": {},
    "expiresAt": "ISO 8601 datetime"
  }
}
```

#### Example
```bash
curl https://api.verinode.com/api/proofs/550e8400-e29b-41d4-a716-446655440000
```

---

### 3. Get User Proofs

**GET** `/api/proofs`

Retrieves proofs with filtering and pagination options.

#### Query Parameters
- `userId` (optional): UUID to filter by user
- `issuer` (optional): Stellar address to filter by issuer
- `verified` (optional): Boolean to filter by verification status
- `status` (optional): Filter by status (`pending`, `verified`, `rejected`, `expired`)
- `limit` (optional): Number of results per page (1-100, default: 20)
- `offset` (optional): Number of results to skip (default: 0)
- `sortBy` (optional): Sort field (`timestamp`, `verifiedAt`)
- `sortOrder` (optional): Sort order (`asc`, `desc`)

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "UUID",
      "issuer": "Stellar address",
      "eventData": {},
      "hash": "hexadecimal string",
      "timestamp": "ISO 8601 datetime",
      "verified": true,
      "userId": "UUID",
      "version": 1,
      "status": "verified"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### Example
```bash
curl "https://api.verinode.com/api/proofs?userId=550e8400-e29b-41d4-a716-446655440000&limit=10&verified=true"
```

---

### 4. Verify Proof

**POST** `/api/proofs/{proofId}/verify`

Verifies a cryptographic proof using specified verification methods.

#### Parameters
- `proofId` (path): UUID of the proof to verify

#### Request Body
```json
{
  "verificationMethod": "stellar" // "stellar", "hash", or "both"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "UUID",
    "issuer": "Stellar address",
    "eventData": {},
    "hash": "hexadecimal string",
    "timestamp": "ISO 8601 datetime",
    "verified": true,
    "verifiedAt": "ISO 8601 datetime",
    "stellarTxId": "stellar transaction ID",
    "userId": "UUID",
    "version": 1,
    "status": "verified"
  },
  "message": "Proof verified successfully"
}
```

#### Rate Limiting
- 30 requests per minute

#### Example
```bash
curl -X POST https://api.verinode.com/api/proofs/550e8400-e29b-41d4-a716-446655440000/verify \
  -H "Content-Type: application/json" \
  -d '{"verificationMethod": "both"}'
```

---

### 5. Batch Operations

**POST** `/api/proofs/batch`

Performs batch operations on multiple proofs.

#### Request Body
```json
{
  "operation": "verify", // "verify", "delete", or "update"
  "proofIds": ["UUID1", "UUID2", "UUID3"],
  "data": {} // Optional data for update operations
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "success": ["UUID1", "UUID2"],
    "failed": [
      {
        "id": "UUID3",
        "error": "Proof not found"
      }
    ]
  },
  "message": "Batch operation completed"
}
```

#### Rate Limiting
- 5 requests per 5 minutes

#### Example
```bash
curl -X POST https://api.verinode.com/api/proofs/batch \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "verify",
    "proofIds": ["550e8400-e29b-41d4-a716-446655440000", "660e8400-e29b-41d4-a716-446655440000"]
  }'
```

---

### 6. Update Proof

**PUT** `/api/proofs/{proofId}`

Updates an existing proof's metadata or other fields.

#### Parameters
- `proofId` (path): UUID of the proof to update

#### Request Body
```json
{
  "metadata": {
    "newField": "newValue"
  },
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "UUID",
    "issuer": "Stellar address",
    "eventData": {},
    "hash": "hexadecimal string",
    "timestamp": "ISO 8601 datetime",
    "verified": true,
    "userId": "UUID",
    "version": 2, // Version incremented
    "status": "verified",
    "metadata": {
      "newField": "newValue"
    },
    "expiresAt": "ISO 8601 datetime"
  },
  "message": "Proof updated successfully"
}
```

#### Example
```bash
curl -X PUT https://api.verinode.com/api/proofs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{"metadata": {"category": "important"}}'
```

---

### 7. Delete Proof

**DELETE** `/api/proofs/{proofId}`

Deletes a proof permanently.

#### Parameters
- `proofId` (path): UUID of the proof to delete

#### Response
```json
{
  "success": true,
  "data": null,
  "message": "Proof deleted successfully"
}
```

#### Example
```bash
curl -X DELETE https://api.verinode.com/api/proofs/550e8400-e29b-41d4-a716-446655440000
```

---

### 8. Get Proof Statistics

**GET** `/api/proofs/stats`

Retrieves statistics about proofs, optionally filtered by user.

#### Query Parameters
- `userId` (optional): UUID to filter statistics by user

#### Response
```json
{
  "success": true,
  "data": {
    "total": 150,
    "verified": 120,
    "pending": 25,
    "rejected": 3,
    "expired": 2
  }
}
```

#### Example
```bash
curl "https://api.verinode.com/api/proofs/stats?userId=550e8400-e29b-41d4-a716-446655440000"
```

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Validation failed or invalid input |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Validation Rules

### Proof Creation
- `eventData`: Required, must be an object
- `hash`: Required, 64-128 characters, hexadecimal
- `issuerAddress`: Required, 56 characters (Stellar address format)
- `userId`: Required, valid UUID
- `metadata`: Optional, must be object if provided
- `expiresAt`: Optional, valid ISO 8601 date in the future

### Proof ID
- Must be a valid UUID format

### Stellar Address
- Must be exactly 56 characters
- Must start with 'G'
- Must contain only valid base32 characters

## Security Considerations

1. **Rate Limiting**: All endpoints are protected by rate limiting to prevent abuse
2. **Input Validation**: All inputs are validated before processing
3. **Hash Verification**: Proof hashes are verified against event data
4. **Expiration**: Proofs can have expiration dates and are automatically marked as expired
5. **Stellar Integration**: Verification includes Stellar blockchain transaction verification

## Testing

### Example Test Cases

#### Create and Verify Proof
```bash
# 1. Create a proof
PROOF_RESPONSE=$(curl -s -X POST https://api.verinode.com/api/proofs \
  -H "Content-Type: application/json" \
  -d '{
    "eventData": {"type": "test", "data": "example"},
    "hash": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890",
    "issuerAddress": "GABCDEFG1234567890ABCDEFG1234567890ABCDEFG1234567890ABCDEFG",
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }')

# Extract proof ID
PROOF_ID=$(echo $PROOF_RESPONSE | jq -r '.data.id')

# 2. Verify the proof
curl -s -X POST https://api.verinode.com/api/proofs/$PROOF_ID/verify \
  -H "Content-Type: application/json" \
  -d '{"verificationMethod": "both"}'
```

#### Batch Verification
```bash
curl -X POST https://api.verinode.com/api/proofs/batch \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "verify",
    "proofIds": [
      "550e8400-e29b-41d4-a716-446655440000",
      "660e8400-e29b-41d4-a716-446655440000"
    ]
  }'
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import axios from 'axios';

class VerinodeAPI {
  private baseURL = 'https://api.verinode.com/api/proofs';

  async createProof(proofData: any) {
    const response = await axios.post(`${this.baseURL}`, proofData);
    return response.data;
  }

  async verifyProof(proofId: string, method: 'stellar' | 'hash' | 'both' = 'both') {
    const response = await axios.post(`${this.baseURL}/${proofId}/verify`, {
      verificationMethod: method
    });
    return response.data;
  }

  async getUserProofs(userId: string, options?: any) {
    const params = { userId, ...options };
    const response = await axios.get(`${this.baseURL}`, { params });
    return response.data;
  }
}
```

### Python
```python
import requests

class VerinodeAPI:
    def __init__(self):
        self.base_url = 'https://api.verinode.com/api/proofs'

    def create_proof(self, proof_data):
        response = requests.post(f'{self.base_url}', json=proof_data)
        return response.json()

    def verify_proof(self, proof_id, method='both'):
        response = requests.post(
            f'{self.base_url}/{proof_id}/verify',
            json={'verificationMethod': method}
        )
        return response.json()

    def get_user_proofs(self, user_id, **options):
        params = {'userId': user_id, **options}
        response = requests.get(f'{self.base_url}', params=params)
        return response.json()
```

## Support

For API support and questions:
- Documentation: https://docs.verinode.com
- Issues: https://github.com/TOPMATRIX/Verinode/issues
- Email: support@verinode.com
