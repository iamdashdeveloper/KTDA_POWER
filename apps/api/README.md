# KTDA Power API Server

A Fastify-based REST API for the KTDA Power application.

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your database connection string
   ```

3. **Run database migrations**
   ```bash
   cd ../../packages/database
   pnpm prisma migrate deploy
   ```

## Development

Start the development server with hot reload:

```bash
pnpm dev
```

The server will listen on `http://localhost:3001`

## Production

Build and start:

```bash
pnpm build
pnpm start
```

## API Endpoints

### Health Check

- **GET** `/health` - Server health status

### Companies

- **GET** `/api/companies` - List all companies
- **POST** `/api/companies` - Create a new company

#### Create Company Request Body

```json
{
  "name": "Company Name",
  "description": "Optional description",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.006
  },
  "metadata": {
    "contact": {
      "email": "contact@company.com",
      "phone": "+1234567890",
      "website": "https://company.com"
    },
    "branding": {
      "logoUrl": "https://example.com/logo.png",
      "primaryColor": "#FF0000"
    }
  }
}
```

## Features

- PostGIS support for geographic data
- Type-safe with TypeScript
- Fastify for high performance
- Prisma ORM for database management
- Graceful shutdown handling
