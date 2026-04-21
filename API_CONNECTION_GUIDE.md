# API Connection Troubleshooting Guide

## Quick Diagnosis

If you see **"Failed to fetch companies"** error in the sign-up form, follow these steps:

### Step 1: Verify API Server is Running

Open a terminal and check if the API is running:

```bash
# Check if API is accessible
curl http://localhost:3001/health

# You should see a response. If not, the API is not running.
```

### Step 2: Start the API Server

If the API is not running, start it:

```bash
# Navigate to API directory
cd apps/api

# Install dependencies (if needed)
pnpm install

# Start development server
pnpm dev

# You should see: "🚀 Server running at http://0.0.0.0:3001"
```

### Step 3: Verify Database Connection

The API requires PostgreSQL. Check your `.env` file:

```bash
# apps/api/.env
DATABASE_URL="postgresql://admin:postgres@localhost:5435/ktpch?schema=public"
```

Make sure PostgreSQL is running and accessible at the configured address.

### Step 4: Ensure Frontend Can Access API

The frontend is configured to connect to `http://localhost:3001` (see `.env`):

```bash
# apps/field-tool/.env
VITE_API_URL=http://localhost:3001
```

Both ports must be accessible:

- Frontend: `http://localhost:5174`
- API: `http://localhost:3001`

## Full Development Setup

To run the complete application:

### Terminal 1: Start PostgreSQL (if using Docker)

```bash
docker-compose up
# Or your preferred PostgreSQL setup
```

### Terminal 2: Start the API

```bash
cd apps/api
pnpm dev
# Waits for: "Server running at http://0.0.0.0:3001"
```

### Terminal 3: Start the Frontend

```bash
cd apps/field-tool
pnpm dev
# Opens at: http://localhost:5174
```

## Error Messages & Solutions

### "Unable to connect to API at http://localhost:3001"

- **Cause:** API server is not running
- **Solution:** Start API with `pnpm dev` in `apps/api` directory

### "Cannot fetch companies: Network Error"

- **Cause:** API is running but database connection failed
- **Solution:** Verify `DATABASE_URL` in `apps/api/.env` and ensure PostgreSQL is running

### "CORS Error"

- **Cause:** API CORS configuration doesn't allow frontend origin
- **Solution:** Check `CORS_ORIGIN` in `apps/api/.env` includes `http://localhost:5174`

### "Failed to parse response"

- **Cause:** API returned unexpected format or error
- **Solution:** Check API logs for errors and verify endpoint returns JSON

## API Configuration

### Environment Variables

**Frontend** (`apps/field-tool/.env`):

```
VITE_API_URL=http://localhost:3001
```

**Backend** (`apps/api/.env`):

```
DATABASE_URL=postgresql://admin:postgres@localhost:5435/ktpch?schema=public
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5174
```

## Testing the Connection

### Using the API Configuration Utility

The frontend includes a built-in API health check:

```typescript
import { checkApiHealth } from "@/lib/api-config"

// Check if API is reachable
const health = await checkApiHealth()
console.log(health)
// Output:
// {
//   isHealthy: true/false,
//   message: "...",
//   url: "http://localhost:3001"
// }
```

### Manual Testing

```bash
# Test API health endpoint
curl http://localhost:3001/health

# Test companies endpoint
curl -X GET http://localhost:3001/companies

# Test with authentication
curl -X GET http://localhost:3001/companies \
  -H "Authorization: Bearer <token>"
```

## Development Tips

1. **Check Browser Console**: Open DevTools (F12) and check Console tab for detailed error messages
2. **Check Network Tab**: Monitor network requests to see exact API calls and responses
3. **Check Terminal Logs**: Both frontend and API terminals show important debug information
4. **Use localhost, not 127.0.0.1**: Some systems have connectivity issues with 127.0.0.1

## Common Commands

```bash
# Kill process on port 3001 (API)
# Windows (PowerShell):
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force

# Linux/Mac:
lsof -ti:3001 | xargs kill -9

# Kill process on port 5174 (Frontend)
# Windows (PowerShell):
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5174).OwningProcess -Force

# Linux/Mac:
lsof -ti:5174 | xargs kill -9
```

## Still Having Issues?

1. **Check that all services are running:**
   - PostgreSQL (port 5435 or configured)
   - API (port 3001)
   - Frontend (port 5174)

2. **Verify environment files exist:**
   - `apps/api/.env` ✅
   - `apps/field-tool/.env` ✅

3. **Check API logs for errors** in the API terminal window

4. **Clear browser cache:** Hard refresh with Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

5. **Check firewall settings:** Ensure ports 3001 and 5174 are not blocked

---

**For more help**, check the API server logs or browser DevTools console for specific error messages.
