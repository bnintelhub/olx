# Authentication & Asynchronous OTP Workflow

This document provides a comprehensive technical reference for the **Authentication Architecture**, **BullMQ Background Email Queue**, and **API Payloads** implemented in the Fastify modular backend for the OLX Marketplace platform.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Workflow Diagrams (Mermaid)](#2-workflow-diagrams-mermaid)
   - [Registration & BullMQ Email OTP Verification](#registration--bullmq-email-otp-verification)
   - [Forgot Password & Reset Workflow](#forgot-password--reset-workflow)
   - [Authentication State Machine](#authentication-state-machine)
3. [API Endpoints & Payloads](#3-api-endpoints--payloads)
   - [1. User Registration (Email)](#1-user-registration-email)
   - [2. Verify Email OTP](#2-verify-email-otp)
   - [3. User Login (Email & Password)](#3-user-login-email--password)
   - [4. Forgot Password](#4-forgot-password)
   - [5. Reset Password](#5-reset-password)
   - [6. Resend OTP](#6-resend-otp)
   - [7. Mobile OTP Request](#7-mobile-otp-request)
   - [8. Mobile OTP Verification](#8-mobile-otp-verification)
   - [9. Refresh Access Token](#9-refresh-access-token)
   - [10. Admin Portal Login](#10-admin-portal-login)
   - [11. Get Current User Profile (`/me`)](#11-get-current-user-profile-me)
   - [12. Logout & Token Revocation](#12-logout--token-revocation)
4. [BullMQ Background Processing](#4-bullmq-background-processing)
5. [Security & Rate Limiting Controls](#5-security--rate-limiting-controls)

---

## 1. Architecture Overview

The authentication system is built with high throughput, strict security, and non-blocking asynchronous email processing in mind:

- **Framework**: Fastify v4 with modular architecture (`src/modules/auth`).
- **Database**: PostgreSQL 16 managed via Prisma ORM (`src/config/prisma.ts`).
- **Cache & Message Broker**: Redis 7.0 for rate-limit cooldowns and BullMQ message broker (`src/config/redis.ts`).
- **Queue Engine**: BullMQ 5.x for offloading email delivery to background workers (`src/jobs/otp.job.ts`).
- **Validation**: Zod runtime schema validation (`src/modules/auth/auth.schema.ts`).
- **Dual-Mode Session Authorization**:
  - **HTTP-Only Cookies (Primary for Web)**: `access_token` (15m expiry, `path: '/'`, `sameSite: 'lax'`, `httpOnly: true`) and `refresh_token` (30d expiry) are automatically set upon login, keeping users logged in across page reloads without exposing tokens to client-side JavaScript (XSS protection).
  - **Authorization Bearer Header (Fallback for Mobile & APIs)**: If no cookie is present in the request, Fastify falls back to parsing `Authorization: Bearer <token>`.
- **Audit Logging & Safety**:
  - `writeAuditLog` records login/logout actions (`USER_EMAIL_LOGIN`, `USER_PHONE_LOGIN`, `ADMIN_LOGIN`, `USER_LOGOUT`).
  - Sensitive data (passwords, tokens, OTPs) is automatically redacted before persistence.
  - Foreign key failures on unknown user IDs gracefully fall back to prevent disrupting user authentication.
  - Passwords hashed using `bcrypt` (12 salt rounds).
  - OTPs hashed using `SHA-256` before persistence.
  - Short-lived JWT Access Tokens (15 minutes).
  - 40-byte cryptographically secure random Refresh Tokens hashed with `SHA-256`.
  - Max 3 verification attempts before OTP session lockout.
  - 45-second resend cooldown enforced via Redis keys.

---

## 2. Workflow Diagrams (Mermaid)

### Registration & BullMQ Email OTP Verification

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Client
    participant API as Fastify API (/api/v1/auth)
    participant Auth as AuthService & DB
    participant Queue as BullMQ (otp-dispatch)
    participant Worker as BullMQ Worker
    participant Mailer as Email Service

    User->>API: POST /register { email, password, name }
    API->>Auth: Validate schema & Hash password
    Auth->>Auth: Create User & OtpSession (SHA-256 hashed OTP)
    Auth->>Queue: Enqueue job "send-otp-email"
    API-->>User: 201 Created { sessionId, expiresInSeconds: 300 }

    Note over Queue,Worker: Asynchronous Background Job Processing
    Worker->>Queue: Pop "send-otp-email" job
    Worker->>Mailer: Send HTML/Text OTP Email
    Mailer-->>User: Email Delivered with 6-digit OTP

    User->>API: POST /verify-email-otp { email, sessionId, otp }
    API->>Auth: Validate session, check expiry & compare SHA-256 hash
    Auth->>Auth: Mark isEmailVerified=true & Generate JWT Tokens
    API-->>User: 200 OK { user, tokens: { accessToken, refreshToken } }
```

---

### Forgot Password & Reset Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Client
    participant API as Fastify API
    participant Redis as Redis Cache
    participant Auth as AuthService & DB
    participant Queue as BullMQ Queue
    participant Worker as BullMQ Worker

    User->>API: POST /forgot-password { email }
    API->>Redis: Check cooldown "otp_cooldown:<email>"
    alt Cooldown Active (< 45s)
        API-->>User: 429 Too Many Requests (Rate limited)
    else Cooldown Cleared
        API->>Auth: Generate 6-digit OTP & create OtpSession
        API->>Redis: Set cooldown key (TTL: 45s)
        API->>Queue: Enqueue BullMQ "send-otp-email"
        API-->>User: 200 OK { sessionId, expiresInSeconds: 300 }
        Worker->>User: Background worker delivers reset email
    end

    User->>API: POST /reset-password { email, sessionId, otp, newPassword }
    API->>Auth: Verify OTP hash, check attempts <= 3
    Auth->>Auth: Update password hash & invalidate active sessions
    Auth->>Redis: Delete user cache "user:<id>"
    API-->>User: 200 OK { message: "Password reset successfully" }
```

---

### Authentication State Machine

```mermaid
flowchart TD
    Start(["User Action"]) --> Mode{"Authentication Method"}
    
    Mode -->|"New Email Account"| Reg["POST /register"]
    Reg --> GenOTP["Generate 6-digit OTP<br/>Store SHA-256 Hash in DB"]
    GenOTP --> QueueJob["BullMQ adds job<br/>'otp-dispatch'"]
    QueueJob --> WorkerSend["Worker sends email<br/>in background"]
    WorkerSend --> VerifyOTP["POST /verify-email-otp"]
    
    VerifyOTP --> CheckAttempts{"Attempts <= 3 &<br/>Not Expired?"}
    CheckAttempts -->|"No"| LockSession["Reject (400/429)<br/>Session Locked"]
    CheckAttempts -->|"Yes"| IssueTokens["Issue Access (15m) &<br/>Refresh Token (7d)"]
    
    Mode -->|"Existing User"| Log["POST /login"]
    Log --> CheckPass{"Validate Password"}
    CheckPass -->|"Valid"| IssueTokens
    CheckPass -->|"Invalid"| RejectLog["401 Invalid Credentials"]
    
    Mode -->|"Forgot Password"| Forgot["POST /forgot-password"]
    Forgot --> CheckCooldown{"Redis Cooldown<br/>Passed (45s)?"}
    CheckCooldown -->|"Wait"| RateErr["429 OTP Rate Limited"]
    CheckCooldown -->|"Ready"| SendReset["BullMQ sends Reset OTP"]
    SendReset --> Reset["POST /reset-password"]
    Reset --> UpdatePass["Hash new password<br/>Invalidate old sessions"]
    UpdatePass --> SuccessReset["200 Password Updated"]

    IssueTokens --> AppAccess(["Access Protected Endpoints<br/>Bearer Authorization"])
```

---

## 3. API Endpoints & Payloads

Base URL: `http://localhost:5000/api/v1/auth`

### 1. User Registration (Email)
Registers a new user account with email and password, creates an unverified account, and dispatches an OTP via the BullMQ background queue.

- **Method / Route**: `POST /api/v1/auth/register`
- **Auth Required**: No

#### Request Payload
```json
{
  "email": "rahul.sharma@example.com",
  "password": "SecurePassword123!",
  "name": "Rahul Sharma"
}
```

#### Field Specifications
| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string` | Yes | Valid email format. Automatically lowercased and trimmed. |
| `password` | `string` | Yes | Minimum 6 characters. |
| `name` | `string` | No | Full display name (minimum 2 characters). |

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "message": "Registration successful. A verification OTP has been sent to your email.",
    "sessionId": "4f9d6c71-f92e-4e3a-9e1f-82bb3d8392a1",
    "expiresInSeconds": 300,
    "mockOtp": "123456"
  },
  "meta": {
    "timestamp": "2026-11-03T21:40:00.000Z"
  }
}
```
*(Note: `mockOtp` is returned only when `NODE_ENV=development` or `NODE_ENV=test` and `SMS_PROVIDER=MOCK`)*

#### Error Responses
- `409 Conflict`:
```json
{
  "success": false,
  "error": {
    "code": "USER_EXISTS",
    "message": "An account with this email address already exists."
  }
}
```
- `400 Bad Request` (Zod validation error):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must be at least 6 characters"
  }
}
```

---

### 2. Verify Email OTP
Validates the OTP sent to the user's email inbox, marks `isEmailVerified = true`, creates session tokens, and logs the user in.

- **Method / Route**: `POST /api/v1/auth/verify-email-otp`
- **Auth Required**: No

#### Request Payload
```json
{
  "email": "rahul.sharma@example.com",
  "sessionId": "4f9d6c71-f92e-4e3a-9e1f-82bb3d8392a1",
  "otp": "123456"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully!",
    "user": {
      "id": "cm4d8a23e0001ux4gq8z99f92",
      "email": "rahul.sharma@example.com",
      "phoneNumber": null,
      "isEmailVerified": true,
      "role": "USER",
      "profile": {
        "id": "cm4d8a23e0002ux4gk7x21a44",
        "name": "Rahul Sharma",
        "avatar": null
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTRkOGEyM2UwMDAxdXg0Z3E4ejk5ZjkyIiwicm9sZSI6IlVTRVIiLCJlbWFpbCI6InJhaHVsLnNoYXJtYUBleGFtcGxlLmNvbSIsImlhdCI6MTczMDY2NTIwMCwiZXhwIjoxNzMwNjY2MTAwfQ.xyz...",
      "refreshToken": "8f48b1116c905b76f2df3e2b2c3a5e8f49d2182c448bb95b281cb93d7c585ef0a912bb09c85112f4",
      "expiresInSeconds": 900
    }
  }
}
```

#### Error Responses
- `400 Bad Request` (Incorrect OTP):
```json
{
  "success": false,
  "error": {
    "code": "INCORRECT_OTP",
    "message": "Incorrect OTP entered. Please try again."
  }
}
```
- `429 Too Many Requests` (Exceeded 3 attempts):
```json
{
  "success": false,
  "error": {
    "code": "MAX_ATTEMPTS_EXCEEDED",
    "message": "Too many invalid attempts. Session locked."
  }
}
```

---

### 3. User Login (Email & Password)
Authenticates a user with email and password and returns JWT access and refresh tokens.

- **Method / Route**: `POST /api/v1/auth/login`
- **Auth Required**: No

#### Request Payload
```json
{
  "email": "rahul.sharma@example.com",
  "password": "SecurePassword123!"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cm4d8a23e0001ux4gq8z99f92",
      "email": "rahul.sharma@example.com",
      "phoneNumber": null,
      "isEmailVerified": true,
      "role": "USER",
      "profile": {
        "id": "cm4d8a23e0002ux4gk7x21a44",
        "name": "Rahul Sharma",
        "avatar": null
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "7e145b27e8a93cb338b5...",
      "expiresInSeconds": 900
    }
  }
}
```

#### Error Responses
- `401 Unauthorized`:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

### 4. Forgot Password
Triggers a password reset code. Validates cooldown in Redis, generates a 6-digit OTP, and enqueues a background email job via BullMQ.

- **Method / Route**: `POST /api/v1/auth/forgot-password`
- **Auth Required**: No

#### Request Payload
```json
{
  "email": "rahul.sharma@example.com"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "message": "Password reset OTP has been sent to your email address.",
    "sessionId": "a57ebfa4-0f2d-4523-956f-ea9834220b32",
    "expiresInSeconds": 300,
    "mockOtp": "123456"
  }
}
```

#### Error Responses
- `404 Not Found`:
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "No account found with this email address."
  }
}
```
- `429 Too Many Requests` (45-second cooldown active):
```json
{
  "success": false,
  "error": {
    "code": "OTP_RATE_LIMITED",
    "message": "Please wait 45 seconds before requesting a new code."
  }
}
```

---

### 5. Reset Password
Validates the password reset OTP, resets the user's password hash in PostgreSQL, and invalidates active Redis caches.

- **Method / Route**: `POST /api/v1/auth/reset-password`
- **Auth Required**: No

#### Request Payload
```json
{
  "email": "rahul.sharma@example.com",
  "sessionId": "a57ebfa4-0f2d-4523-956f-ea9834220b32",
  "otp": "123456",
  "newPassword": "NewStrongPassword456@"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "message": "Password has been reset successfully. Please log in with your new password."
  }
}
```

#### Error Responses
- `400 Bad Request` (Invalid or expired reset session):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SESSION",
    "message": "Invalid or expired password reset session."
  }
}
```

---

### 6. Resend OTP
Resends an OTP for either email verification or mobile SMS, enforcing the 45-second cooldown period.

- **Method / Route**: `POST /api/v1/auth/resend-otp`
- **Auth Required**: No

#### Request Payload (Email)
```json
{
  "email": "rahul.sharma@example.com",
  "purpose": "EMAIL_VERIFICATION"
}
```

#### Request Payload (Mobile)
```json
{
  "phoneNumber": "9876543210",
  "purpose": "LOGIN"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "message": "A new OTP has been sent to your email.",
    "sessionId": "c88f3422-0f2d-4523-956f-ea9834220c99",
    "expiresInSeconds": 300,
    "resendCooldownSeconds": 45,
    "mockOtp": "123456"
  }
}
```

---

### 7. Mobile OTP Request
Sends an OTP via SMS to a 10-digit Indian mobile number.

- **Method / Route**: `POST /api/v1/auth/otp/send`
- **Auth Required**: No

#### Request Payload
```json
{
  "phoneNumber": "9876543210"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "sessionId": "1e7cb834-8c87-4fcb-b384-569d2f267fa2",
    "expiresInSeconds": 300,
    "resendCooldownSeconds": 45,
    "mockOtp": "123456"
  }
}
```

---

### 8. Mobile OTP Verification
Verifies mobile OTP and logs in / registers the user.

- **Method / Route**: `POST /api/v1/auth/otp/verify`
- **Auth Required**: No

#### Request Payload
```json
{
  "phoneNumber": "9876543210",
  "sessionId": "1e7cb834-8c87-4fcb-b384-569d2f267fa2",
  "otp": "123456"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cm4d8a23e0001ux4gq8z99f92",
      "phoneNumber": "+919876543210",
      "email": null,
      "isPhoneVerified": true,
      "role": "USER",
      "profile": {
        "id": "cm4d8a23e0002ux4gk7x21a44",
        "name": null,
        "avatar": null
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "3a92...",
      "expiresInSeconds": 900
    },
    "isNewUser": false
  }
}
```

---

### 9. Refresh Access Token
Rotates the session by validating the refresh token against the SHA-256 hash stored in PostgreSQL, and generates a fresh access token.

- **Method / Route**: `POST /api/v1/auth/refresh`
- **Auth Required**: No

#### Request Payload
```json
{
  "refreshToken": "8f48b1116c905b76f2df3e2b2c3a5e8f49d2182c448bb95b281cb93d7c585ef0a912bb09c85112f4"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "6b23d9124a9198f7...",
    "expiresInSeconds": 900
  }
}
```

---

### 10. Admin Portal Login
Allows administrators to log into the moderation portal with username/email and password.

- **Method / Route**: `POST /api/v1/auth/admin-login`
- **Auth Required**: No

#### Request Payload
```json
{
  "username": "admin@bharatmarket.local",
  "password": "AdminStrongPassword123!"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "cm4d8adm0001ux4gq8z99f99",
      "username": "admin",
      "email": "admin@bharatmarket.local",
      "role": "SUPER_ADMIN"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "9d41...",
      "expiresInSeconds": 900
    }
  }
}
```

---

### 11. Get Current User Profile (`/me`)
Retrieves the logged-in user profile, permissions, and active settings.

- **Method / Route**: `GET /api/v1/auth/me`
- **Auth Required**: Yes (`Authorization: Bearer <accessToken>`)

#### Headers
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "cm4d8a23e0001ux4gq8z99f92",
    "phoneNumber": "+919876543210",
    "email": "rahul.sharma@example.com",
    "role": "USER",
    "status": "ACTIVE",
    "isPhoneVerified": true,
    "isEmailVerified": true,
    "profile": {
      "id": "cm4d8a23e0002ux4gk7x21a44",
      "name": "Rahul Sharma",
      "avatar": "https://cdn.bharatmarket.local/avatars/user123.jpg"
    }
  }
}
```

#### Error Response
- `401 Unauthorized` (Token missing or invalid):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authorization header missing or invalid token format"
  }
}
```

---

### 12. Logout & Token Revocation
Invalidates the stored refresh token in PostgreSQL and clears active cached sessions in Redis.

- **Method / Route**: `POST /api/v1/auth/logout`
- **Auth Required**: Yes (`Authorization: Bearer <accessToken>`)

#### Headers
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

## 4. BullMQ Background Processing

BullMQ is configured with Redis 7.0 to guarantee reliable, asynchronous email dispatch without increasing HTTP request latency.

### Queue Configuration (`src/jobs/otp.job.ts`)
```typescript
export const otpQueue = new Queue<OtpJobData>('otp-dispatch', {
  connection: {
    url: env.REDIS_URL,
    maxRetriesPerRequest: null, // Required by BullMQ worker architecture
  },
  defaultJobOptions: {
    attempts: 3,                 // Automatically retry up to 3 times on transient failure
    backoff: {
      type: 'exponential',       // Wait 2s, then 4s, then 8s between retries
      delay: 2000,
    },
    removeOnComplete: true,      // Clean up completed jobs to conserve Redis RAM
    removeOnFail: false,         // Keep failed jobs for inspection and alerting
  },
});
```

### Worker Lifecycle
The BullMQ worker listens on the `otp-dispatch` queue and delivers emails through `EmailService.sendOtpEmail`:
```typescript
export const otpWorker = new Worker<OtpJobData>(
  'otp-dispatch',
  async (job: Job<OtpJobData>) => {
    const { to, otp, purpose } = job.data;
    await EmailService.sendOtpEmail(to, otp, purpose);
  },
  { connection }
);
```

---

## 5. Security & Rate Limiting Controls

| Mechanism | Setting / Strategy | Purpose |
|---|---|---|
| **Password Hashing** | `bcrypt` (12 rounds) | Protection against rainbow table and brute-force attacks |
| **OTP Hashing** | `SHA-256` | OTP values never stored in plaintext in the database |
| **OTP Expiry** | 300 seconds (5 mins) | Minimized window of vulnerability |
| **Max Attempts** | 3 attempts per session | Prevents online brute forcing; locks session upon 3rd failure |
| **Resend Cooldown** | 45 seconds (`Redis TTL`) | Prevents SMS/Email flooding and denial-of-wallet attacks |
| **Access Token** | JWT (15-minute expiry) | Limits exposure if access token is leaked |
| **Refresh Token** | 40-byte cryptographically random hex | Rotated on each refresh; single-use security |
| **API Rate Limit** | 100 requests per 15 minutes | Protects Fastify server against DDoS and credential stuffing |
| **Audit Logging** | PostgreSQL `AuditLog` table | Non-repudiation and security tracking for login/password changes |


