# 🔐 Marketplace Keycloak Authentication and Backend Integration Guide

This document provides a **comprehensive, high-level design and setup guide** for integrating **Keycloak** with the **Marketplace Backend**. It includes environment setup, client and realm configuration, test user creation, backend design overview, and lifecycle management.

---

## 1️⃣ Overview of Keycloak Integration

### Objective
Enable secure authentication and authorization for Marketplace applications using **Keycloak** as the Identity Provider (IdP). The goal is to enforce centralized, standards-based identity management with **OIDC** and **RBAC**.

### Key Components
| Component | Purpose |
|------------|----------|
| **Keycloak Server** | Handles user authentication, token issuance, role management, and introspection. |
| **Marketplace Backend API** | Validates tokens via introspection, enforces role-based access control, and secures all routes. |
| **Frontend UI** | Obtains tokens from Keycloak using OIDC flow and includes them in API requests. |

### Authentication Flow Summary
1. **User Authentication** – Marketplace UI redirects to Keycloak for login.
2. **Token Exchange** – Keycloak returns access and ID tokens to the UI.
3. **API Calls** – The UI includes the token in `Authorization: Bearer <token>` headers.
4. **Backend Validation** – The backend introspects tokens using Keycloak's token introspection endpoint.
5. **Authorization** – Backend grants or denies access based on token validity and assigned roles.

### Backend Responsibilities
1. Receive and validate incoming access tokens from the frontend.
2. Introspect tokens via Keycloak using the `backend-api` client credentials.
3. Cache introspection responses for performance and minimize Keycloak load.
4. Extract user identity and roles from introspection response.
5. Enforce RBAC: `marketplace-approver` → privileged; `marketplace-user` → standard access.
6. Respond with `401` (unauthorized) or `403` (forbidden) where applicable.

### Token Lifecycle
| Stage | Description |
|--------|--------------|
| **Issuance** | Keycloak issues JWTs to authenticated users. |
| **Validation** | Backend introspects tokens on every request. |
| **Caching** | Short-term cache reduces repeated network calls. |
| **Expiration** | Tokens expire per Keycloak configuration; expired tokens trigger re-authentication. |
| **Revocation** | Introspection ensures immediate revocation detection. |

---

## 2️⃣ Backend Application Configuration

### Prerequisites
Before integrating with Keycloak, ensure Keycloak is setup with frontend and backend clients.
These Keycloak artifacts (realm, roles, users or AD federation) should be provisioned and verified before wiring the backend environment variables and authentication middleware.

- **Keycloak realm**
  - Create a realm named `marketplace` (or use your established realm name).

- **Frontend (UI) client**
  - Client ID: `marketplace-ui`
  - Access Type: Public (OIDC)
  - Flow: Authorization Code + PKCE
  - Valid Redirect URIs: e.g. `http://localhost:3000/*`
  - Web Origins: e.g. `http://localhost:3000`
  - Ensure the client exposes required scopes (openid, profile, email) and accepts PKCE.

- **Backend (API) confidential client**
  - Client ID: `marketplace-api`
  - Access Type: Confidential (OIDC)
  - Client Authentication: ON
  - After creating, copy the client secret and store it in your backend secrets (do NOT commit).
  - Example env variables to configure in backend:
    ```bash
    KEYCLOAK_CLIENT_ID=backend-api
    KEYCLOAK_CLIENT_SECRET=<paste-backend-client-secret-here>
    ```

- **Realm roles and mappings**
  - Create realm roles / mappings:
    - `marketplace-approver` (privileged)
    - `marketplace-requestor` (readonly)
  - Ensure the built‑in `roles` client scope is included in **Default Client Scopes** so `realm_access.roles` appear in issued tokens.
  - For any client-specific role needs, map realm roles into client scopes or use protocol mappers as appropriate.

- Users (local test users) or AD/LDAP integration
  - Local test users (example):
    - alice / P@ssw0rd1 → assign `marketplace-approver`, `marketplace-requestor`
    - bob / P@ssw0rd1 → assign `marketplace-requestor`
    - Set passwords (Credentials) and turn OFF “Temporary Password”
  - AD/LDAP integration (production or org-managed users):
    - Configure User Federation → LDAP/AD connector
    - Map LDAP attributes to Keycloak attributes (username, email, groups)
    - Use role mappers or group-to-role mappings to populate `realm_access.roles`
    - Ensure SSO and sync schedules meet your org policies

- Token & scope considerations
  - Ensure `openid` scope is enabled for all clients that perform OIDC flows.
  - Configure protocol mappers if you need custom claims (e.g., email).

- Service account / machine-to-machine usage
  - For backend-to-Keycloak calls (introspection, admin requests), use the `marketplace-api` service account or a separate confidential client with least privilege.
  - Store client secrets in a secure secret store (e.g., Azure Key Vault, AWS Secrets Manager).

- Operational prerequisites
  - Network access: backend must reach Keycloak base URL (consider firewall/NAT)
  - TLS: use HTTPS for Keycloak in non-development environments
  - Time sync: ensure servers (Keycloak, backend) have synchronized clocks (NTP)

### Backend Configuration
  Configure the following environment variables in your backend application environment (`.env` or environment variables):

  ```bash
  # Keycloak Server Configuration
  KEYCLOAK_BASE_URL=http://localhost:8085          # Keycloak server base URL
  KEYCLOAK_REALM=marketplace                        # Realm name in Keycloak
  KEYCLOAK_CLIENT_ID=backend-api                   # Backend confidential client ID
  KEYCLOAK_CLIENT_SECRET=<your-client-secret>      # Client secret from Keycloak

  # Token Introspection Endpoint (auto-constructed if not provided)
  KEYCLOAK_INTROSPECTION_ENDPOINT=${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token/introspect

  # Role Configuration
  MARKETPLACE_ADJUDICATOR_ROLE=marketplace-approver # Role for privileged access
  MARKETPLACE_REQUESTOR_ROLE=marketplace-requestor       # Role for standard users

  # Token Validation Settings
  EXPECTED_ISSUER=${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}
  EXPECTED_AUDIENCE=backend-api                     # Expected audience claim in tokens

  # Cache Settings (optional, for performance)
  KEYCLOAK_CACHE_ENABLED=true                       # Enable token introspection caching
  KEYCLOAK_CACHE_TTL=300                           # Cache TTL in seconds (5 minutes)
  KEYCLOAK_CACHE_MAX_SIZE=1000                     # Maximum cached entries

  # Development/Testing Flags
  KEYCLOAK_BYPASS_AUTH=false                       # NEVER set to true in production
  NODE_ENV=development                             # Set to 'production' in prod
  ```

  ### Backend Dependencies
  Ensure the following npm packages are installed:

  ```bash
  npm install node-fetch lru-cache crypto
  ```

### Backend Authentication Middleware
The backend uses a centralized authentication middleware (`authConfig.ts`) that:
1. Extracts bearer token from `Authorization` header
2. Checks local LRU cache for previously validated tokens
3. Introspects token with Keycloak if not cached or expired
4. Validates token claims (active, issuer, audience, expiration, not-before)
5. Caches successful introspection results
6. Attaches user identity and roles to `req.auth` for downstream use
7. Throws `AuthenticationError` (401) for validation failures
8. Routes errors through centralized `errorHandler` middleware

### Error Handling
The backend implements structured error handling with two main error categories:

**Authentication Errors (401)** – `AuthenticationError` with 10 error codes:
- `MISSING_TOKEN` – No bearer token provided
- `INVALID_TOKEN_FORMAT` – Malformed token
- `TOKEN_EXPIRED` – Token past expiration time
- `TOKEN_NOT_YET_VALID` – Token before valid time (nbf)
- `TOKEN_INACTIVE` – Token marked inactive by introspection
- `INVALID_ISSUER` – Token issuer mismatch
- `INVALID_AUDIENCE` – Token audience mismatch
- `INTROSPECTION_FAILED` – Keycloak introspection HTTP error
- `INTROSPECTION_ERROR` – Network or client error during introspection
- `INTERNAL_ERROR` – Internal authentication processing error

**Authorization Errors (403)** – `UnauthorizedUserError` and subclasses:
- `UnauthorizedUserError` – Base class for authorization denials
- `UnauthorizedAdjudicatorError` – User lacks adjudicator/approver role
- `UnauthorizedRequestorError` – User lacks requestor role

### Security Best Practices
1. **Never commit secrets** – Use secret managers (AWS Secrets Manager) in production
2. **Use HTTPS** – Always use `https://` for `KEYCLOAK_BASE_URL` in production environments
3. **Short token TTLs** – Configure Keycloak to issue tokens with 5–15 minute expiration
4. **Enable token rotation** – Configure refresh token rotation in Keycloak
5. **Rate limiting** – Implement rate limiting on introspection endpoint calls
6. **Audit logging** – Enable structured logging for all authentication/authorization events (see `AuthenticationError` and `UnauthorizedUserError` classes)

All errors are logged with structured context (user, roles, path, method) and return sanitized responses to clients. See `README_ERRORS.md` for detailed usage patterns.

## 3️⃣ Verification Steps
After configuration, verify the backend is ready:

1. **Check environment variables**:
   ```bash
   node -e "console.log(process.env.KEYCLOAK_BASE_URL)"
   ```

2. **Test Keycloak connectivity**:
   ```bash
   curl ${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/.well-known/openid-configuration
   ```

3. **Start backend application**:
   ```bash
   npm run start:dev
   # or
   npm run start
   ```

4. **Check logs for startup messages** – Look for Keycloak initialization confirmation

5. **Test authentication endpoint** (see Section 7 for token testing)

---

## 4️⃣ Local Keycloak Setup (Optional for Local Testing)

This section describes how to run Keycloak locally for development and testing. **This is optional** – you can use an existing Keycloak instance (development, staging, or production) if available.

### Prerequisites
- Docker and Docker Compose installed
- Open port `8085` for local Keycloak (or choose another port)

### Step 1 – Run Keycloak in Docker
```yaml
version: '3.9'
services:
  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    container_name: keycloak
    command: ["start-dev", "--http-port", "8085", "--hostname", "localhost"]
    environment:
      - KEYCLOAK_ADMIN=admin
      - KEYCLOAK_ADMIN_PASSWORD=admin
    ports:
      - '8085:8085'
    restart: unless-stopped
```
Run Keycloak:
```bash
docker compose up -d
```
Access the admin console: [http://localhost:8085](http://localhost:8085) → login as `admin / admin` (change password immediately).

> **Note**: If using a remote Keycloak instance, skip this section and use the appropriate `KEYCLOAK_BASE_URL` in your backend configuration.

---

### Step 2 Create Realms, Roles, and Users

#### Create Realm
- Navigate to: **Realm Selector → Create Realm**
- Name: `marketplace`

#### Define Roles
Go to **Realm Roles → Create** and add:
- `marketplace-approver` (privileged access)
- `marketplace-user` (default user role)

> ⚙️ Ensure the built-in `roles` client scope is included under **Default Client Scopes** so that `realm_access.roles` appear in issued tokens.

#### Create Test Users
**Users → Add User → Create the following:**
| Username | Password | Roles |
|-----------|-----------|--------|
| alice | `P@ssw0rd1` | `marketplace-approver`, `marketplace-user` |
| bob | `P@ssw0rd1` | `marketplace-user` |

For each user:
- Set password under **Credentials**.
- Turn OFF “Temporary Password”.
- Assign roles under **Role Mappings**.

---

### Configure Clients

#### Frontend Client (Public)
| Field | Value |
|--------|--------|
| **Client ID** | `frontend-web` |
| **Client Type** | OpenID Connect |
| **Access Type** | Public |
| **Valid Redirect URIs** | `http://localhost:3000/*` |
| **Web Origins** | `http://localhost:3000` |

This client handles the **Authorization Code + PKCE flow** for browser-based login.

#### Backend Client (Confidential)
| Field | Value |
|--------|--------|
| **Client ID** | `backend-api` |
| **Client Type** | OpenID Connect |
| **Access Type** | Confidential |
| **Service Accounts** | ON |
| **Client Authentication** | ON |

After saving, go to **Credentials** and copy the **Client Secret**. Store it securely in your backend environment variables or secrets manager.

> ✅ No admin roles are required for the backend client to call the introspection endpoint.

---

## 5️⃣ Testing the Configuration

### Obtain Access Token
```bash
curl -s -X POST http://localhost:8085/realms/marketplace/protocol/openid-connect/token \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=password' \
  -d 'client_id=test-cli' \
  -d 'client_secret=<secret>' \
  -d 'username=alice' \
  -d 'password=P@ssw0rd1' | jq -r .access_token > alice.jwt
```

### Introspect Token
```bash
curl -s -u backend-api:<secret> \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d token="$(cat alice.jwt)" \
  http://localhost:8085/realms/marketplace/protocol/openid-connect/token/introspect | jq
```

Expected output includes `active: true` and user roles under `realm_access.roles`.

### Use Token with Backend Requests Endpoint

You can now call your backend API by sending the token in the Authorization header. Replace BACKEND_BASE_URL and the endpoint path with your service values.

Examples:

- Bash (macOS/Linux or Git Bash on Windows)
  ```bash
  export BACKEND_BASE_URL=http://localhost:8080
  TOKEN=$(cat alice.jwt)

  # Example POST to a protected endpoint (adjust path/body as needed)
  curl -i \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -X POST "${BACKEND_BASE_URL}/api/requests/viewAll" \
    -d '{}'
  ```

- PowerShell (Windows)
  ```powershell
  $env:BACKEND_BASE_URL = "http://localhost:8080"
  $token = Get-Content -Raw .\alice.jwt
  $headers = @{ Authorization = "Bearer $token" }

  # Example POST to a protected endpoint (adjust path/body as needed)
  Invoke-RestMethod -Uri "$env:BACKEND_BASE_URL/api/requests/viewAll" -Method Post -Headers $headers -Body '{}' -ContentType 'application/json' -SkipHttpErrorCheck
  ```

Expected results:
- 200 OK with JSON payload if the token is valid and the user has the required role(s)
- 401 Unauthorized for missing/expired/invalid tokens (AuthenticationError)
- 403 Forbidden when the user is authenticated but lacks required role(s) (UnauthorizedUserError)

Tip: For requestor-only operations, use the requestor test user. For adjudicator-only operations, use the approver test user. See role mappings above.

---
## 6️⃣ Common Issues & Debugging

Concise troubleshooting steps and checks to diagnose authentication/authorization problems.

- Check Keycloak availability
  - Verify Keycloak service is running and reachable at KEYCLOAK_BASE_URL.
  - Confirm network/firewall rules and correct port.

- Validate environment and client configuration
  - Confirm KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID, and KEYCLOAK_CLIENT_SECRET are correct.
  - Ensure frontend and backend clients have expected access types and redirect URIs.

- Inspect tokens
  - Decode JWTs (e.g., jwt.io) and verify issuer, audience, exp, nbf, and realm_access.roles.
  - Ensure the `roles` client scope or protocol mapper is included so roles appear in tokens.

- Test introspection
  - Use curl with backend client credentials to call the introspection endpoint and confirm `active: true`.
  - Example:
    curl -s -u backend-api:<secret> -d token="<token>" ${KEYCLOAK_INTROSPECTION_ENDPOINT}

- Check middleware and cache
  - Enable debug logging in auth middleware to see token extraction, validation, and cache hits/misses.
  - Clear or inspect LRU cache if stale data suspected.

- Troubleshoot common errors
  - ECONNREFUSED: Keycloak down or wrong URL/port.
  - active:false: token expired or invalid credentials.
  - Missing roles: add built-in `roles` scope to Default Client Scopes or adjust mappers.
  - 403 despite correct role: verify claim path (realm_access.roles) and audience/issuer checks.
  - CORS issues: ensure UI origin is allowed in client settings.
  - Time skew: sync server clocks (NTP).

- Logging and diagnostics
  - Correlate backend logs (request id, path, user) with Keycloak admin logs.
  - Capture introspection HTTP responses for failed validations.
  - Use temporary increased log level only in non-production environments.

If these steps don't resolve the issue, capture request traces, token payloads (sanitized), and Keycloak admin events and open an incident with those artifacts.

| Symptom | Likely Cause | Resolution |
|----------|---------------|-------------|
| `ECONNREFUSED` | Keycloak not running or wrong port | Verify Docker container and URL. |
| `active:false` | Token expired or invalid credentials | Re-authenticate and reissue token. |
| Missing roles | `roles` scope missing from Default Client Scopes | Add built-in `roles` scope in Keycloak. |
| 403 despite correct role | Incorrect claim path | Check `realm_access.roles` in token payload. |
| CORS issues | UI origin not allowed | Configure `Access-Control-Allow-Origin` properly. |
| Time skew | Server clock misalignment | Sync clocks via NTP. |

---

## ✅ Summary
This setup enables a **secure, modular, and standards-compliant authentication system** for Marketplace. It supports both frontend and backend clients, uses Keycloak as the single source of truth, and enforces **Role-Based Access Control** using introspection and realm-defined roles.

By following this guide, developers can:
- Reproduce a working local Keycloak setup with test users and roles.
- Integrate the backend securely via introspection.
- Maintain compliance with IL2/IL5 security assurance levels.
