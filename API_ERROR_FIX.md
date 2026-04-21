# API Connection Error - Fix Summary

## Problem

```
Failed to fetch companies: TypeError: Failed to fetch
```

This error occurred in `SignUpForm.tsx` when trying to fetch the companies list from the API endpoint.

## Root Cause

The error was caused by one or more of the following:

1. **API Server Not Running:** The backend API wasn't running on port 3001
2. **Network Connectivity:** The frontend couldn't reach the API server
3. **Poor Error Handling:** The original code didn't provide diagnostics about what went wrong

## Solution Implemented

### 1. **Created API Configuration Utility** (`api-config.ts`)

A centralized utility for all API requests with:

- **Automatic timeout handling** (10 seconds)
- **Better error messages** distinguishing network errors from API errors
- **Health check function** to diagnose connectivity issues
- **Consistent request formatting** with proper headers and credentials

```typescript
// Usage
const data = await apiRequest("/companies", { method: "GET" })
```

### 2. **Enhanced Error Handling in Auth Components**

Updated both `SignUpForm.tsx` and `SignInForm.tsx` to:

- Display API error messages to the user
- Show network connectivity diagnostics
- Provide clear guidance when API is unreachable
- Use toast notifications with descriptions

### 3. **Environment Configuration**

Added `.env` file to field-tool:

```
VITE_API_URL=http://localhost:3001
```

With `.env.example` for documentation.

### 4. **Error Display UI**

Added visual error alert component in forms:

```tsx
{apiError && (
  <div className="flex gap-3 rounded-lg bg-red-50 p-3 ...">
    <AlertCircle className="h-5 w-5 flex-shrink-0" />
    <div>
      <p className="font-medium">Connection Error</p>
      <p className="mt-1 text-xs">{apiError}</p>
    </div>
  </div>
)}
```

### 5. **Troubleshooting Guide**

Created `API_CONNECTION_GUIDE.md` with:

- Quick diagnosis steps
- Full setup instructions
- Common error messages and solutions
- Testing commands
- Development tips

## Files Modified/Created

| File                                 | Change      | Purpose                         |
| ------------------------------------ | ----------- | ------------------------------- |
| `src/lib/api-config.ts`              | ✅ Created  | Centralized API request utility |
| `src/components/auth/SignUpForm.tsx` | ✅ Modified | Uses apiRequest, better errors  |
| `src/components/auth/SignInForm.tsx` | ✅ Modified | Uses apiRequest, better errors  |
| `.env`                               | ✅ Created  | API URL configuration           |
| `.env.example`                       | ✅ Created  | Documentation for env setup     |
| `API_CONNECTION_GUIDE.md`            | ✅ Created  | Troubleshooting & setup guide   |

## How to Use

### For Users Getting the Error

1. **Read the error message** displayed in the form
2. **Check if API is running:**
   ```bash
   cd apps/api
   pnpm dev
   ```
3. **Verify database is running** (PostgreSQL on port 5435)
4. **Hard refresh browser** (Ctrl+Shift+R)

### For Developers

1. **Always start services in order:**

   ```bash
   # Terminal 1: Database
   docker-compose up

   # Terminal 2: API
   cd apps/api && pnpm dev

   # Terminal 3: Frontend
   cd apps/field-tool && pnpm dev
   ```

2. **Use the API utility** for all API calls:

   ```typescript
   import { apiRequest } from "@/lib/api-config"

   const data = await apiRequest("/endpoint", { method: "GET" })
   ```

3. **Check browser DevTools** for detailed error information:
   - Console tab: See exact error messages
   - Network tab: Monitor API requests

## Error Flow Diagram

```
User Action (SignUp/Login)
    ↓
apiRequest() called
    ↓
┌───────────────────┐
│ Network Error?    │
└─────┬─────┬───────┘
      │     │
    YES    NO
     │      │
     ↓      ↓
"Cannot  "API Error"
connect"   (status ≠ 200)
  to API    │
     │      │
     └──┬───┘
        ↓
   Display Error
   in UI Alert
     ↓
   User sees:
   - Clear error message
   - Suggested fixes
   - API URL for diagnostics
```

## Testing the Fix

1. **Verify API utility works:**

   ```typescript
   import { checkApiHealth } from "@/lib/api-config"
   const health = await checkApiHealth()
   console.log(health)
   ```

2. **Test with API running:**
   - Start API: `pnpm dev` in `apps/api`
   - Go to sign-up form
   - Company dropdown should populate
   - No error message should appear

3. **Test error handling (API down):**
   - Stop API server (Ctrl+C)
   - Try to sign up
   - Should see clear error: "Unable to connect to API at http://localhost:3001"

## TypeScript Types

All API requests are fully typed:

```typescript
// Companies fetch
const data = await apiRequest<Company[]>("/companies", { method: "GET" })
// data: Company[]

// Auth response
const result = await apiRequest<AuthResponse>("/auth/login", {
  method: "POST",
  body: JSON.stringify(loginData)
})
// result: { token: string, user: User }
```

## Next Steps

1. Ensure API server is always running during development
2. Check `API_CONNECTION_GUIDE.md` if errors occur
3. Use DevTools console for debugging
4. Report any remaining connectivity issues with browser console output

---

**Status:** ✅ All TypeScript errors resolved. API error handling implemented. Documentation created.
