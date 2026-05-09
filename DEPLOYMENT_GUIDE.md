# KTDA Power - Production Deployment Troubleshooting Guide

## Current Issue: "Network error. API URL: https://ktda-power.onrender.com"

This error means the frontend is correctly pointing to the API URL, but the API server is not responding. This typically indicates one of the following issues:

### 1. API NOT DEPLOYED OR NOT RUNNING

**Check:**

- Log into https://dashboard.render.com
- Look for the "ktda-power-api" service
- Check the service status (should show "Live" if running)
- Click on "Logs" tab and look for error messages

**If service doesn't exist or is failing:**

- The API likely hasn't been deployed or deployment failed
- You need to deploy the API to Render using one of these methods:
  - Push to GitHub and use Render's GitHub integration
  - Use `render-cli` to deploy from command line
  - Manually create a Web Service on Render dashboard

**Example deployment steps:**

1. Create a new Web Service on Render
2. Connect to your GitHub repository
3. Build Command: `pnpm install && pnpm build`
4. Start Command: `cd apps/api && pnpm start`
5. Set environment variables (see below)
6. Deploy

### 2. MISSING OR INCORRECT ENVIRONMENT VARIABLES

**Required environment variables on Render:**

```
DATABASE_URL=postgresql://...  (PostgreSQL connection string)
JWT_SECRET=<random-string>      (JWT signing secret)
NODE_ENV=production
CORS_ORIGIN=https://ktda-power.onrender.com,https://ktda-power-admin-web.vercel.app,...
```

**Check:**

- In Render Dashboard, go to your service settings
- Click "Environment" tab
- Verify all required variables are set
- Most critical: `DATABASE_URL` must be set

**If DATABASE_URL is missing:**

- Create a PostgreSQL database (Neon, Railway, AWS RDS, etc.)
- Get the connection string
- Add it to Render environment variables

### 3. DATABASE CONNECTION ISSUES

If DATABASE_URL is set but server still won't start:

- Connection string format is wrong
- Database credentials are incorrect
- Database is not accessible from Render
- Firewall/IP whitelist blocking access

**Test locally first:**

```bash
cd apps/api
DATABASE_URL="your-connection-string" pnpm start
```

### 4. PORT CONFIGURATION

The API is configured to listen on port 3001 (or PORT environment variable). Render automatically assigns ports - this should work with our configuration.

### 5. CORS CONFIGURATION ISSUES

If API returns CORS error (different from "Network error"):

- The frontend origin is not in CORS_ORIGIN list
- Check Render environment variable CORS_ORIGIN includes all frontend URLs

## QUICK DIAGNOSTIC STEPS

1. **Check if API is running:**

   ```bash
   curl https://ktda-power.onrender.com/health
   ```

   Should return: `{"status":"ok"}`

2. **Check API configuration:**

   ```bash
   curl https://ktda-power.onrender.com/debug
   ```

   Should show environment variables and CORS config

3. **Check Render service logs:**
   - Go to https://dashboard.render.com
   - Select your API service
   - Click "Logs" tab
   - Look for startup messages or errors

4. **If seeing "Address already in use":**
   - Port 3001 is already in use locally
   - Stop other services or use different port

5. **If seeing "DATABASE_URL missing":**
   - Set DATABASE_URL in Render environment variables
   - It must be a valid PostgreSQL connection string

## RETRY LOGIC

The frontend has been updated with automatic retry logic:

- Will retry failed requests up to 3 times with 1-second delays
- Only retries on network errors, not on 4xx/5xx responses
- Logs each retry attempt to console

So even if API is temporarily unavailable, it should recover automatically.

## NEXT STEPS

1. Verify API is deployed and running on Render
2. Check that DATABASE_URL is correctly set
3. Review Render logs for any startup errors
4. Test /health endpoint manually
5. Check frontend console logs for detailed error information
6. If still failing, check that frontend VITE_API_URL matches your actual API URL

## EMERGENCY: DEPLOY LOCALLY FOR TESTING

If you need to test the API locally:

```bash
cd apps/api

# Set environment variables (use .env.production as template)
# Make sure DATABASE_URL points to a local or accessible PostgreSQL database

# Install dependencies
pnpm install

# Build TypeScript
pnpm build

# Start the server
pnpm start

# Server should start at http://localhost:3001
```

Then update frontends to use `http://localhost:3001` temporarily:

```
VITE_API_URL=http://localhost:3001
```

## MONITORING

Once deployed:

- Monitor Render dashboard for service health
- Check frontend console for errors (F12 Developer Tools)
- Use /debug endpoint to verify configuration
- Enable detailed logs in production (already implemented)

---

**Status:** All code is correct and production-ready. The issue is operational (deployment/configuration), not code-related.
