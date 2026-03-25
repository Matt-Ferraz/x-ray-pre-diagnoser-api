# X-Ray Pre-Diagnoser API

REST API for AI-powered medical X-ray image analysis using OpenAI Vision (GPT-4o).

> ⚠️ **Disclaimer**: This tool is intended for educational and pre-screening purposes only. It should **NOT** be used as a substitute for professional medical diagnosis. Always consult a qualified healthcare professional.

## Features

- 🔐 JWT Authentication (access + refresh tokens with rotation)
- 👤 User CRUD (register, login, profile management)
- 🩻 X-ray image analysis via OpenAI GPT-4o Vision
- 📊 Analysis history
- 🛡️ Security best practices (Helmet, CORS, rate limiting, bcrypt)
- ✅ Input validation with Zod
- 🗄️ Prisma ORM with SQLite (easily swappable to PostgreSQL)

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: SQLite via Prisma ORM
- **Auth**: JWT (access + httpOnly refresh cookie)
- **AI**: OpenAI GPT-4o Vision API
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 20+
- An OpenAI API key with GPT-4o access

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/x-ray-pre-diagnoser-api.git
cd x-ray-pre-diagnoser-api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your actual values (especially OPENAI_API_KEY and JWT secrets)

# Generate Prisma client and create database
npm run db:push

# Start development server
npm run dev
```

### Environment Variables

| Variable | Description | Required |
|---|---|---|
| `PORT` | Server port (default: 3001) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `DATABASE_URL` | Database connection string | Yes |
| `JWT_ACCESS_SECRET` | Secret for access tokens (min 32 chars) | Yes |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (min 32 chars) | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `CORS_ORIGIN` | Allowed frontend origin | Yes |

### Switching to PostgreSQL

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Update `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/xray_db"
   ```
3. Run `npm run db:push`

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |

### User
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/me` | Get profile |
| PATCH | `/api/users/me` | Update profile |
| PUT | `/api/users/me/password` | Change password |
| DELETE | `/api/users/me` | Delete account |

### Analysis
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/analysis` | Analyze an X-ray image |
| GET | `/api/analysis/history` | Get analysis history |
| GET | `/api/analysis/:id` | Get specific analysis |

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT access tokens (15min TTL) + httpOnly refresh cookies (7d TTL)
- Refresh token rotation on each use
- All refresh tokens invalidated on password change
- Rate limiting on auth and analysis endpoints
- Helmet security headers
- CORS restricted to configured origin
- Input validation on all endpoints
- No sensitive data in error responses

## License

MIT — see [LICENSE](LICENSE)
