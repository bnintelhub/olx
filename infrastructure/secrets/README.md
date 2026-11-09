# Secrets Management

Guidelines for environment secrets:
- Never commit `.env` or raw API keys into git.
- In CI/CD, store secrets in GitHub Repository Secrets:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
- In Production/Staging, inject secrets via AWS Secrets Manager, HashiCorp Vault, or Docker secret mounts.

