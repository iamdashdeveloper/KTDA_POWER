# Field Tool Production Deployment Fixes

## Summary

✅ **Field-tool is now fully configured for production deployment to Render**

All API client inconsistencies have been fixed. The app now uses a unified `ApiClient` pattern that handles credentials correctly for cross-origin requests.

## Changes Made

### 1. OnboardingStepper.tsx (apps/field-tool/src/components/auth/OnboardingStepper.tsx)

**Problem:** Raw fetch with `credentials: "include"` causing CORS preflight failures
**Fix:**

- Replaced raw `fetch()` call with `ApiClient.post()`
- Removed unused `apiBaseUrl` state variable
- Simplified error handling - ApiClient now handles all network issues
- Authorization token is now automatically added via ApiClient interceptors

```typescript
// Before
const response = await fetch(`${apiBaseUrl}/auth/onboarding`, {
  method: "POST",
  credentials: "include",
  headers: { "Authorization": `Bearer ${token}` },
  body: JSON.stringify(data),
})

// After
const result = await ApiClient.post<{ user: any }>("/auth/onboarding", data)
```

### 2. SignUpForm.tsx (apps/field-tool/src/components/auth/SignUpForm.tsx)

**Problem:** Using legacy `apiRequest()` function with `credentials: "include"` and no retry logic
**Fix:**

- Replaced import from `@/lib/api-config` to `@/lib/api`
- Replaced `apiRequest("/companies")` with `ApiClient.get<Company[]>("/companies")`
- Replaced `apiRequest("/auth/register")` with `ApiClient.post<{ token: string; user: any }>("/auth/register", data)`
- Removed diagnostic error messages (ApiClient provides better logging)

```typescript
// Before
const data = await apiRequest<Company[]>("/companies", { method: "GET" })

// After
const data = await ApiClient.get<Company[]>("/companies")
```

### 3. SignInForm.tsx (apps/field-tool/src/components/auth/SignInForm.tsx)

**Problem:** Using legacy `apiRequest()` function with credentials and no retry logic
**Fix:**

- Replaced import from `@/lib/api-config` to `@/lib/api`
- Replaced `apiRequest("/auth/login")` with `ApiClient.post<{ token: string; user: any }>("/auth/login", data)`

```typescript
// Before
const result = await apiRequest<any>("/auth/login", {
  method: "POST",
  body: JSON.stringify(data),
})

// After
const result = await ApiClient.post<{ token: string; user: any }>("/auth/login", data)
```

## API Client Pattern Used

All field-tool API calls now use the unified `ApiClient` from `@/lib/api.ts`:

**Key Features:**

- ✅ `credentials: "omit"` (no cookies sent, compatible with CORS)
- ✅ 3 automatic retries on network failure
- ✅ 30-second timeout per request
- ✅ Authorization header support (token-based auth)
- ✅ Detailed error logging for debugging
- ✅ Type-safe with TypeScript generics

**Usage:**

```typescript
import { ApiClient } from "@/lib/api"

// GET request
const data = await ApiClient.get<ResponseType>("/endpoint")

// POST request
const data = await ApiClient.post<ResponseType>("/endpoint", { body: "data" })
```

## Backend CORS Configuration

The API server (apps/api/src/app.ts) is configured to accept field-tool from:

- ✅ https://ktda-power-field-tool.vercel.app (production)
- ✅ http://localhost:5173 (local development)
- ✅ All Render preview URLs matching `*.onrender.com`

CORS is configured with:

- Origin validation with regex pattern matching
- `credentials: false` (no cookie verification needed)
- Authorization header support
- Proper Content-Type handling

## Files No Longer Needed

`apps/field-tool/src/lib/api-config.ts` is now **deprecated** but can remain in codebase. It was a legacy API client with:

- Raw fetch() without retry logic
- `credentials: "include"` (breaks CORS in production)
- Manual error handling
- No type safety

**Recommendation:** Remove in next refactor, but leaving it doesn't break anything.

## Build Status

✅ **All 4 apps compile successfully:**

- admin-web: TypeScript ✓ Vite ✓
- web-portal: TypeScript ✓ Vite ✓
- field-tool: TypeScript ✓ Vite ✓
- api: TypeScript ✓ Fastify ✓

## Testing Checklist for Production

When deployed to Vercel + Render, test these flows:

1. **Sign In Page** (`/auth/signin`)
   - Enter credentials
   - Should POST to `/auth/login` successfully
   - Should store token in localStorage
   - Should redirect to projects page

2. **Sign Up Page** (`/auth/signup`)
   - Load companies dropdown - Should GET `/companies` successfully
   - Submit registration - Should POST to `/auth/register` successfully
   - Should store token and user data
   - Should show success message

3. **Onboarding Stepper** (post-signup)
   - Complete onboarding form
   - Should POST to `/auth/onboarding` successfully
   - Should update user profile

4. **Project Manager** (`/projects`)
   - Should load projects list - GET `/projects` successfully
   - Should handle project operations

5. **Error Scenarios** (verify ApiClient retry logic)
   - Network disconnection - should retry 3 times
   - Server 500 error - should retry 3 times
   - Timeout after 30 seconds
   - Should show meaningful error messages

## Environment Variables

Ensure these are set in Vercel deployment:

```
VITE_API_URL=https://ktda-power-api.onrender.com
```

The build will inject this URL at compile time into all API calls.

## Related Fixes in Previous Sessions

This session completed the final piece of field-tool production deployment:

**Session Overview:**

1. ✅ Fixed 48+ TypeScript errors across all apps (Days 1-2)
2. ✅ Replaced hardcoded localhost URLs with environment variables (Day 3)
3. ✅ Implemented CORS and error handling framework (Days 4-5)
4. ✅ Fixed credentials/CORS in web-portal (Day 6)
5. ✅ **Fixed credentials/CORS in field-tool** (Today)

**Status:** All 4 apps are now production-ready and properly configured for Render + Vercel deployment.
