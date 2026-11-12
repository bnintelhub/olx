# Infrastructure Secrets Directory

This directory centralizes all environment secrets for BLX Orbit across deployment environments.

## File Structure

```text
infrastructure/
├── .env.production               <-- Top-level app config for production (ports, URLs, rates)
├── .env.production.example
├── .env.dev                      <-- Top-level app config for dev
├── .env.dev.example
└── secrets/
    ├── database.env              <-- Production DB (Neon DB / External PostgreSQL)
    ├── database.dev.env          <-- Dev DB (Local Docker PostgreSQL)
    ├── database.env.example
    ├── redis.env                 <-- Redis cache & Socket.IO pub/sub URI
    ├── redis.env.example
    ├── jwt.env                   <-- JWT auth & session signing keys
    ├── jwt.env.example
    ├── payment.env               <-- PayU payment gateway keys
    ├── payment.env.example
    ├── firebase.env              <-- FCM push notification credentials
    ├── firebase.env.example
    ├── media.env                 <-- Media microservice & storage paths
    └── media.env.example
```

## How It Works in Docker Compose

Docker Compose services load their required configuration via `env_file:`:

* **Fastify Server (`server`)**:
  Loads `.env.production` + `database.env` + `redis.env` + `jwt.env` + `payment.env` + `firebase.env` + `media.env`.
* **Media Microservice (`media-service`)**:
  Loads `.env.production` + `database.env` + `redis.env` + `media.env`.
* **Background Worker (`workers`)**:
  Loads `.env.production` + `database.env` + `redis.env` + `media.env` + `firebase.env`.
* **Cache (`redis`)**:
  Loads `redis.env`.
* **Database (`postgres`)**:
  Loads `database.dev.env` (if using local Postgres container).

## VPS Terminal Operations

To update secrets on a VPS:
```bash
cd /opt/olx/infrastructure/secrets

# Update database connection (e.g. Neon DB):
nano database.env

# Update payment keys:
nano payment.env

# Update JWT keys:
nano jwt.env
```

After modifying secrets, restart the containers:
```bash
docker compose -f docker-compose.deployment.yml up -d
```
