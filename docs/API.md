# Emily API Documentation

## 1. Overview

Emily is a comprehensive multi-tenant platform API that provides services for tenant management, white-label customization, credit management, and trust/review systems. The API follows RESTful conventions with JSON request/response payloads.

### Base URL
```
https://api.emily.example.com/v1
```

### Authentication Requirements
All API requests require authentication via API key passed in the request headers. Requests without valid authentication will receive a `401 Unauthorized` response.

---

## 2. Authentication

### How to Get API Key

API keys can be obtained through the Emily Developer Portal:

1. Register for a developer account at `https://developers.emily.example.com`
2. Create an application in the dashboard
3. Generate an API key with appropriate permissions
4. Store the key securely — it will only be displayed once

### Required Headers

All API requests must include the following headers:

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <YOUR_API_KEY>` | Yes |
| `Content-Type` | `application/json` | Yes (for POST/PUT) |
| `Accept` | `application/json` | Yes |

### Example Authorization Header
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Endpoints

### Tenants

#### List Tenants

```http
GET /api/tenants
```

**Description:** Retrieves a paginated list of all tenants accessible to your account.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20, max: 100) |
| `status` | string | No | Filter by status (active, suspended, deleted) |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "tenant_abc123",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "status": "active",
      "created_at": "2025-01-15T10:30:00Z",
      "member_count": 45
    },
    {
      "id": "tenant_def456",
      "name": "TechStart Inc",
      "slug": "techstart-inc",
      "status": "active",
      "created_at": "2025-02-20T14:45:00Z",
      "member_count": 12
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "has_more": false
  }
}
```

---

#### Create Tenant

```http
POST /api/tenants
```

**Description:** Creates a new tenant organization.

**Request Body:**
```json
{
  "name": "New Company",
  "slug": "new-company",
  "settings": {
    "timezone": "America/New_York",
    "currency": "USD"
  }
}
```

**Response (201 Created):**
```json
{
  "id": "tenant_ghi789",
  "name": "New Company",
  "slug": "new-company",
  "status": "active",
  "created_at": "2025-03-10T08:00:00Z",
  "settings": {
    "timezone": "America/New_York",
    "currency": "USD"
  }
}
```

---

#### Get Tenant

```http
GET /api/tenants/{id}
```

**Description:** Retrieves detailed information for a specific tenant.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique tenant identifier |

**Response (200 OK):**
```json
{
  "id": "tenant_abc123",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "status": "active",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-03-01T12:00:00Z",
  "settings": {
    "timezone": "America/New_York",
    "currency": "USD",
    "features": ["credit", "trust"]
  },
  "member_count": 45,
  "owner_id": "user_xyz789"
}
```

---

#### Update Tenant

```http
PUT /api/tenants/{id}
```

**Description:** Updates tenant information.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique tenant identifier |

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "settings": {
    "timezone": "America/Los_Angeles"
  }
}
```

**Response (200 OK):**
```json
{
  "id": "tenant_abc123",
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "status": "active",
  "updated_at": "2025-03-10T15:30:00Z"
}
```

---

#### List Members

```http
GET /api/tenants/{id}/members
```

**Description:** Lists all members of a specific tenant.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique tenant identifier |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number |
| `limit` | integer | No | Items per page |
| `role` | string | No | Filter by role (admin, member, viewer) |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "user_abc123",
      "email": "john@example.com",
      "name": "John Smith",
      "role": "admin",
      "joined_at": "2025-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "has_more": false
  }
}
```

---

#### Invite Member

```http
POST /api/tenants/{id}/invite
```

**Description:** Sends a membership invitation to an email address.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique tenant identifier |

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "member",
  "message": "Welcome to our team!"
}
```

**Response (201 Created):**
```json
{
  "id": "invite_jkl012",
  "email": "newmember@example.com",
  "role": "member",
  "status": "pending",
  "expires_at": "2025-03-17T08:00:00Z",
  "created_at": "2025-03-10T08:00:00Z"
}
```

---

### White-Label

#### Get White-Label Config

```http
GET /api/white-label/{tenantSlug}
```

**Description:** Retrieves white-label configuration for a tenant.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantSlug` | string | Yes | Unique tenant slug |

**Response (200 OK):**
```json
{
  "tenant_slug": "acme-corp",
  "company_name": "Acme Corporation",
  "logo_url": "https://cdn.emily.example.com/logos/acme.png",
  "primary_color": "#2563eb",
  "secondary_color": "#1e40af",
  "custom_domain": "portal.acme.com",
  "features": {
    "show_credit_score": true,
    "enable_reviews": true
  }
}
```

---

#### Get CSS Variables

```http
GET /api/white-label/{tenantSlug}/css
```

**Description:** Returns CSS custom properties for white-label styling.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantSlug` | string | Yes | Unique tenant slug |

**Response (200 OK):**
```css
:root {
  --emily-primary-color: #2563eb;
  --emily-secondary-color: #1e40af;
  --emily-accent-color: #3b82f6;
  --emily-text-color: #1f2937;
  --emily-bg-color: #ffffff;
  --emily-border-radius: 8px;
  --emily-font-family: 'Inter', system-ui, sans-serif;
}
```

---

#### Update White-Label Config

```http
PUT /api/admin/white-label
```

**Description:** Updates white-label configuration (admin only).

**Request Body:**
```json
{
  "tenant_slug": "acme-corp",
  "company_name": "Acme Corporation",
  "primary_color": "#dc2626",
  "secondary_color": "#b91c1c"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "White-label configuration updated",
  "config": {
    "tenant_slug": "acme-corp",
    "company_name": "Acme Corporation",
    "primary_color": "#dc2626",
    "secondary_color": "#b91c1c"
  }
}
```

---

#### Add Domain

```http
POST /api/admin/white-label/domains
```

**Description:** Adds a custom domain for white-labeling (admin only).

**Request Body:**
```json
{
  "tenant_slug": "acme-corp",
  "domain": "portal.acme.com",
  "ssl_enabled": true
}
```

**Response (201 Created):**
```json
{
  "id": "domain_mno345",
  "tenant_slug": "acme-corp",
  "domain": "portal.acme.com",
  "status": "pending_verification",
  "ssl_enabled": true,
  "verified_at": null
}
```

---

### Credit

#### Get Credit Profile

```http
GET /api/credit/{clientId}
```

**Description:** Retrieves credit profile for a specific client.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | string | Yes | Unique client identifier |

**Response (200 OK):**
```json
{
  "client_id": "client_pqr678",
  "credit_score": 720,
  "credit_limit": 50000,
  "available_credit": 35000,
  "used_credit": 15000,
  "status": "active",
  "last_updated": "2025-03-10T12:00:00Z",
  "payment_history": {
    "on_time": 12,
    "late": 1,
    "missed": 0
  }
}
```

---

#### Apply for Credit

```http
POST /api/credit
```

**Description:** Subits a credit application.

**Request Body:**
```json
{
  "client_id": "client_new901",
  "requested_limit": 100000,
  "purpose": "business_expansion",
  "annual_revenue": 500000,
  "years_in_business": 5
}
```

**Response (201 Created):**
```json
{
  "application_id": "app_stu234",
  "client_id": "client_new901",
  "status": "under_review",
  "requested_limit": 100000,
  "submitted_at": "2025-03-10T08:00:00Z",
  "estimated_decision": "2025-03-12T17:00:00Z"
}
```

---

#### Get Credit Summary

```http
GET /api/credit/{clientId}/summary
```

**Description:** Retrieves a summary of credit status and history.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | string | Yes | Unique client identifier |

**Response (200 OK):**
```json
{
  "client_id": "client_pqr678",
  "current_balance": 15000,
  "credit_limit": 50000,
  "utilization_rate": 30,
  "available_credit": 35000,
  "next_payment_due": "2025-04-01",
  "next_payment_amount": 1500,
  "avg_payment_time": 5
}
```

---

#### List Transactions

```http
GET /api/credit/{clientId}/transactions
```

**Description:** Lists all credit transactions for a client.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | string | Yes | Unique client identifier |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number |
| `limit` | integer | No | Items per page |
| `type` | string | No | Filter by type (charge, payment, adjustment) |
| `start_date` | date | No | Filter start date |
| `end_date` | date | No | Filter end date |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "txn_vwx567",
      "type": "charge",
      "amount": 5000,
      "description": "Equipment purchase",
      "date": "2025-03-05T10:30:00Z",
      "reference": "INV-2025-001"
    },
    {
      "id": "txn_yza890",
      "type": "payment",
      "amount": -2000,
      "description": "Payment received",
      "date": "2025-03-01T14:00:00Z",
      "reference": "PAY-2025-001"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "has_more": false
  }
}
```

---

#### Record Payment

```http
POST /api/credit/{clientId}/payment
```

**Description:** Records a payment against the client's credit balance.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | string | Yes | Unique client identifier |

**Request Body:**
```json
{
  "amount": 5000,
  "payment_method": "bank_transfer",
  "reference": "PAY-2025-002",
  "notes": "Monthly payment"
}
```

**Response (201 Created):**
```json
{
  "id": "txn_yza891",
  "client_id": "client_pqr678",
  "type": "payment",
  "amount": -5000,
  "payment_method": "bank_transfer",
  "reference": "PAY-2025-002",
  "date": "2025-03-10T08:00:00Z",
  "new_balance": 10000
}
```

---

#### Adjust Balance

```http
POST /api/credit/{clientId}/adjust
```

**Description:** Makes a manual adjustment to client's credit balance (admin only).

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | string | Yes | Unique client identifier |

**Request Body:**
```json
{
  "amount": 1000,
  "type": "credit",
  "reason": "Service refund",
  "reference": "REF-2025-001"
}
```

**Response (201 Created):**
```json
{
  "id": "txn_bcd234",
  "client_id": "client_pqr678",
  "type": "adjustment",
  "amount": -1000,
  "reason": "Service refund",
  "reference": "REF-2025-001",
  "date": "2025-03-10T09:00:00Z",
  "new_balance": 9000
}
```

---

### Trust

#### Get Trust Rating

```http
GET /api/trust/{entityId}
```

**Description:** Retrieves trust rating and metrics for an entity.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityId` | string | Yes | Unique entity identifier |

**Response (200 OK):**
```json
{
  "entity_id": "entity_efg345",
  "entity_type": "vendor",
  "overall_rating": 4.5,
  "total_reviews": 127,
  "rating_distribution": {
    "5": 89,
    "4": 28,
    "3": 7,
    "2": 2,
    "1": 1
  },
  "metrics": {
    "reliability": 4.7,
    "communication": 4.3,
    "quality": 4.6,
    "value": 4.4
  },
  "last_updated": "2025-03-10T12:00:00Z"
}
```

---

#### Get Reviews

```http
GET /api/trust/{entityId}/reviews
```

**Description:** Retrieves reviews for an entity.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityId` | string | Yes | Unique entity identifier |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number |
| `limit` | integer | No | Items per page |
| `rating` | integer | No | Filter by rating (1-5) |
| `sort` | string | No | Sort by (recent, highest, lowest) |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "review_hij678",
      "entity_id": "entity_efg345",
      "reviewer_id": "user_xyz789",
      "reviewer_name": "John D.",
      "rating": 5,
      "title": "Excellent service!",
      "content": "Very professional and timely delivery. Would recommend.",
      "created_at": "2025-03-08T15:30:00Z",
      "helpful_count": 12,
      "verified": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "has_more": false
  }
}
```

---

#### Submit Review

```http
POST /api/trust/{entityId}/reviews
```

**Description:** Submits a new review for an entity.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityId` | string | Yes | Unique entity identifier |

**Request Body:**
```json
{
  "rating": 5,
  "title": "Great experience",
  "content": "The team was incredibly helpful and the product exceeded expectations.",
  "metrics": {
    "reliability": 5,
    "communication": 5,
    "quality": 5,
    "value": 4
  }
}
```

**Response (201 Created):**
```json
{
  "id": "review_klm901",
  "entity_id": "entity_efg345",
  "rating": 5,
  "title": "Great experience",
  "status": "published",
  "created_at": "2025-03-10T08:00:00Z"
}
```

---

#### Get Top Rated

```http
GET /api/trust/leaderboard
```

**Description:** Retrieves the top-rated entities.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | integer | No | Number of results (default: 10, max: 50) |
| `entity_type` | string | No | Filter by entity type (vendor, partner, etc.) |
| `min_reviews` | integer | No | Minimum review count |

**Response (200 OK):**
```json
{
  "data": [
    {
      "rank": 1,
      "entity_id": "entity_abc123",
      "entity_name": "Premium Services Inc",
      "entity_type": "vendor",
      "rating": 4.9,
      "total_reviews": 342
    },
    {
      "rank": 2,
      "entity_id": "entity_def456",
      "entity_name": "Fast Solutions",
      "entity_type": "vendor",
      "rating": 4.8,
      "total_reviews": 256
    }
  ],
  "generated_at": "2025-03-10T12:00:00Z"
}
```

---

#### Vote on Review

```http
POST /api/trust/{reviewId}/vote
```

**Description:** Submits a vote (helpful/not helpful) on a review.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reviewId` | string | Yes | Unique review identifier |

**Request Body:**
```json
{
  "vote": "helpful"
}
```

**Response (200 OK):**
```json
{
  "review_id": "review_hij678",
  "vote_type": "helpful",
  "helpful_count": 13,
  "message": "Vote recorded successfully"
}
```

---

## 4. Examples

### cURL Examples

#### List Tenants
```bash
curl -X GET "https://api.emily.example.com/v1/api/tenants?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"
```

#### Create Tenant
```bash
curl -X POST "https://api.emily.example.com/v1/api/tenants" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Company",
    "slug": "my-company",
    "settings": {
      "timezone": "America/New_York",
      "currency": "USD"
    }
  }'
```

#### Get Credit Profile
```bash
curl -X GET "https://api.emily.example.com/v1/api/credit/client_abc123" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Accept: application/json"
```

#### Submit Review
```bash
curl -X POST "https://api.emily.example.com/v1/api/trust/entity_xyz789/reviews" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "title": "Outstanding service",
    "content": "Very satisfied with the experience."
  }'
```

#### Record Payment
```bash
curl -X POST "https://api.emily.example.com/v1/api/credit/client_abc123/payment" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "payment_method": "credit_card",
    "reference": "PAY-2025-003"
  }'
```

---

## 5. Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `400` | Bad Request | Invalid request parameters or body |
| `401` | Unauthorized | Missing or invalid authentication token |
| `403` | Forbidden | Insufficient permissions to access resource |
| `404` | Not Found | Requested resource does not exist |
| `409` | Conflict | Resource conflict (e.g., duplicate entry) |
| `422` | Unprocessable Entity | Validation error in request body |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side error |
| `502` | Bad Gateway | Invalid response from upstream service |
| `503` | Service Unavailable | Service temporarily unavailable |
| `504` | Gateway Timeout | Upstream service timeout |

### Error Response Format

```json
{
  "error": {
    "code": "400",
    "status": "Bad Request",
    "message": "Validation failed",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      },
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "request_id": "req_abc123xyz",
    "timestamp": "2025-03-10T08:00:00Z"
  }
}
```

### Common Error Messages

| Message | Resolution |
|---------|------------|
| "Invalid API key" | Verify your API key is correct and hasn't expired |
| "Rate limit exceeded" | Wait before retrying or contact support for increased limits |
| "Tenant not found" | Check the tenant ID is correct and you have access |
| "Insufficient permissions" | Contact your admin to request additional permissions |
| "Domain already exists" | Use a different domain or update existing one |

---

## Rate Limits

| Plan | Requests/minute | Requests/day |
|------|-----------------|--------------|
| Free | 60 | 1,000 |
| Pro | 300 | 50,000 |
| Enterprise | 1,000 | Unlimited |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1646928000
```

---

## Versioning

This API uses URL versioning. The current version is `v1`. When breaking changes are introduced, a new version (e.g., `v2`) will be released, and `v1` will be supported for 12 months.

To use a specific version, include it in the base URL:
```
https://api.emily.example.com/v1/api/tenants
```

---

## Support

- **Documentation:** https://docs.emily.example.com
- **Developer Portal:** https://developers.emily.example.com
- **API Status:** https://status.emily.example.com
- **Support Email:** api-support@emily.example.com
