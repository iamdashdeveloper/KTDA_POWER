# Authentication Implementation Guide

## Overview

This document outlines the complete authentication and onboarding system implemented for the Field Tool application.

## System Architecture

### Backend (API)

Located in: `apps/api/src/routes/auth/`

#### Endpoints

1. **POST `/auth/register`** - User registration
   - Accepts: email, password, firstName, lastName, companyId
   - Returns: JWT token, user object, isOnboarded flag
   - Sets: HTTP-only secure cookie with JWT token

2. **POST `/auth/login`** - User authentication
   - Accepts: email, password
   - Returns: JWT token, user object, isOnboarded flag
   - Sets: HTTP-only secure cookie with JWT token

3. **POST `/auth/onboarding`** - Complete user profile (protected)
   - Requires: Valid JWT token
   - Accepts: position, bio (optional), avatarUrl (optional)
   - Returns: Updated user object with isOnboarded = true

4. **POST `/auth/refresh`** - Refresh JWT token (protected)
   - Requires: Valid JWT token
   - Returns: New JWT token

5. **POST `/auth/logout`** - Clear session
   - Clears: authToken cookie

#### Security Features

- Passwords hashed with bcryptjs (10 salt rounds)
- JWT tokens with 7-day expiration
- HTTP-only secure cookies (production only)
- SameSite=lax for CSRF protection
- Password validation: min 8 chars, 1 uppercase, 1 number

### Frontend (Field Tool)

Located in: `apps/field-tool/src/components/auth/`

#### Components

1. **SignInForm.tsx**
   - Email and password login
   - Error handling and loading states
   - Navigation to signup
   - Stores token and user in localStorage

2. **SignUpForm.tsx**
   - User registration with full details
   - Company selection dropdown
   - Fetches available companies from API
   - Real-time form validation
   - Password strength requirements

3. **OnboardingStepper.tsx**
   - Multi-step onboarding wizard using Konsta UI
   - Step 1: Position (required)
   - Step 2: Bio (optional)
   - Step 3: Confirmation
   - Previous/Next navigation
   - Skip option on Step 1

4. **AuthPage.tsx** (pages/Auth.tsx)
   - Main authentication page
   - Handles navigation between signin/signup/onboarding
   - Checks authentication status
   - Redirects to home if fully authenticated

#### API Client

`lib/api.ts` - Centralized API communication

```typescript
ApiClient.get()    // GET requests
ApiClient.post()   // POST requests
ApiClient.put()    // PUT requests
ApiClient.patch()  // PATCH requests
ApiClient.delete() // DELETE requests

authApi.signin()    // Login
authApi.signup()    // Register
authApi.onboard()   // Complete profile
authApi.refresh()   // Refresh token
authApi.logout()    // Logout
```

## Data Flow

### Registration Flow

```
SignUpForm → POST /auth/register
  ↓
API validates and creates user
  ↓
JWT token generated, cookie set
  ↓
User data stored in localStorage
  ↓
Redirect to OnboardingStepper
```

### Login Flow

```
SignInForm → POST /auth/login
  ↓
API validates credentials
  ↓
Update lastLogin timestamp
  ↓
JWT token generated, cookie set
  ↓
Check isOnboarded flag
  ↓
If onboarded → redirect to /home
If not → show OnboardingStepper
```

### Onboarding Flow

```
OnboardingStepper → POST /auth/onboarding
  ↓
API updates user profile
  ↓
Sets isOnboarded = true
  ↓
User data updated in localStorage
  ↓
Redirect to /home
```

## Environment Variables

### Frontend (.env)

```
VITE_API_URL=http://localhost:3001
```

### Backend (.env)

```
JWT_SECRET=your-secret-key
NODE_ENV=development|production
```

## Database Schema

User model fields used in auth:

- `id` - User ID (cuid)
- `email` - Unique email address
- `password` - Hashed password
- `firstName` - First name
- `lastName` - Last name
- `companyId` - Company association (required)
- `position` - User's role/position
- `bio` - Short biography
- `avatarUrl` - Profile picture URL
- `isEmailVerified` - Email verification status
- `lastLogin` - Last login timestamp
- `createdAt` - Account creation date

## Security Considerations

1. **JWT Token Storage**
   - Primary: HTTP-only cookies (secure)
   - Fallback: localStorage (token string only)

2. **Password Security**
   - Minimum 8 characters
   - Must contain uppercase and number
   - Hashed with bcryptjs before storage

3. **Protected Routes**
   - `/auth/onboarding` requires valid JWT
   - `/auth/refresh` requires valid JWT
   - Token verified on each protected endpoint

4. **CORS & Credentials**
   - Credentials included in all requests
   - SameSite cookie policy
   - Proper CORS headers set

## Usage Instructions

### For Developers

1. **Install Dependencies**

   ```bash
   cd apps/field-tool
   pnpm add
   ```

2. **Update Environment**
   - Create `.env.local` with VITE_API_URL

3. **Test Auth Flow**
   - Start API: `cd apps/api && pnpm dev`
   - Start Frontend: `cd apps/field-tool && pnpm dev`
   - Navigate to `/auth` page

### For Users

1. **Sign Up**
   - Click "Sign up" on login page
   - Enter details and select company
   - Complete onboarding wizard

2. **Sign In**
   - Enter email and password
   - If onboarded, redirects to home
   - If not, shows onboarding

3. **Onboarding**
   - Step 1: Enter your position
   - Step 2: Add optional bio
   - Step 3: Confirm and complete

## Future Enhancements

- [ ] Email verification
- [ ] Password reset via email
- [ ] Social authentication (Google, etc.)
- [ ] Two-factor authentication
- [ ] Role-based access control
- [ ] Profile picture upload
- [ ] Session management UI
- [ ] Device trust/remember me
