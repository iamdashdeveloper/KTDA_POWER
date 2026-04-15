# KTDA Power - Complete Setup Guide

## What Was Implemented

### 1. **Error Handler with Sonner Toast Notifications** ✅

- `errorHandler.ts` - Centralized error handling
- Toast notifications for success, error, and warning messages
- Integrated into all forms and components
- Proper error message formatting for different error types

### 2. **Fastify Backend API** ✅

- Located at `apps/api/src/server.ts`
- Full TypeScript support with tsconfig
- Endpoints:
  - `GET /health` - Health check
  - `GET /api/companies` - List all companies
  - `POST /api/companies` - Create company with location and metadata

### 3. **Geolocation Features** ✅

- Search location by address (using Nominatim)
- Use current GPS location (browser geolocation API)
- Map picker with Leaflet
- Manual latitude/longitude input
- Toast notifications for success/error feedback

### 4. **Frontend Form Integration** ✅

- CompanyForm properly submits location data
- GeometryPicker syncs values with parent form
- Form resets after successful submission
- Error handling with toast notifications

### 5. **Database Schema** ✅

- Company model with PostGIS geometry support
- Location stored as `geometry(Point, 4326)` in PostgreSQL
- Metadata field for flexible JSON storage

## How to Run

### 1. Install Dependencies

```bash
cd c:\Users\Administrator\Desktop\Work\KTDA_Power\v4
pnpm install
```

### 2. Configure Database

```bash
# Update .env in packages/database with your PostgreSQL connection
DATABASE_URL="postgresql://user:password@localhost:5432/ktda_power"

# Run migrations (if not already done)
cd packages/database
pnpm prisma migrate deploy
```

### 3. Configure API Server

```bash
cd apps/api
cp .env.example .env
# Update .env with your database connection
```

### 4. Start Development Servers

```bash
# From root directory - starts both frontend and backend with turbo
cd c:\Users\Administrator\Desktop\Work\KTDA_Power\v4
pnpm dev

# Or separately:
# Terminal 1 - Frontend
cd apps/admin-web
pnpm dev

# Terminal 2 - Backend API
cd apps/api
pnpm dev
```

## API Usage

### Create Company with Location

```bash
POST http://localhost:3001/api/companies

{
  "name": "Hydro Power Plant A",
  "description": "Main facility",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "metadata": {
    "contact": {
      "email": "contact@company.com",
      "phone": "+1234567890"
    }
  }
}
```

### Response

```json
{
  "name": "Hydro Power Plant A",
  "description": "Main facility",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.006
  },
  "message": "Company created successfully!"
}
```

## Frontend Features

### GeometryPicker Component

1. **Search Location** - Enter address and get coordinates via Nominatim
2. **Use Current Location** - Get user's GPS coordinates
3. **Map Interaction** - Click on map to set location
4. **Manual Input** - Type latitude/longitude directly
5. **Toast Feedback** - Real-time notifications

### CompanyForm

1. **Basic Information** - Company name and description
2. **Location Selection** - Full geolocation picker
3. **Metadata Editor** - Contact info, branding, etc.
4. **Form Validation** - Zod schema validation
5. **Error Handling** - Toast notifications

## Files Modified/Created

### New Files

- `apps/api/src/server.ts` - Fastify server
- `apps/api/tsconfig.json` - TypeScript config
- `apps/api/.env.example` - Environment template
- `apps/api/README.md` - API documentation

### Modified Files

- `apps/admin-web/src/lib/errorHandler.ts` - Fixed imports
- `apps/admin-web/src/layouts/RootLayout.tsx` - Added Toaster
- `apps/admin-web/src/pages/UserCreate.tsx` - Integrated error handler
- `apps/admin-web/src/components/forms/CompanyForm.tsx` - Fixed submission
- `apps/admin-web/src/components/forms/GeometryPicker.tsx` - Fixed geolocation sync
- `apps/admin-web/package.json` - Added sonner dependency
- `apps/api/package.json` - Updated with proper config

## Next Steps

1. **Test the API** - Use Postman or curl to test endpoints
2. **Set up Database** - Ensure PostgreSQL with PostGIS is running
3. **Test Geolocation** - Try all location picking methods
4. **Add More APIs** - Extend with users, projects, etc.
5. **Deploy** - Set up production environment
