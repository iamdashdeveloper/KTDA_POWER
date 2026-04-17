# USSD Service Integration

The USSD service has been migrated from a standalone Express.js app into the main FastifyJS API as a service module. This provides direct access to the Prisma schema and simplifies the deployment architecture.

## Architecture

**Location**: `/apps/api/src/services/ussdService.ts`

The USSD service is now:

- ✅ A Fastify plugin registered in the main API
- ✅ Using the same Prisma client instance as the API
- ✅ Running on the same port as the main API (3001)
- ✅ No longer requiring separate deployment or inter-service calls

## Endpoints

### POST /ussd

Handle USSD interactions for reporting hydro project issues.

**Request Body:**

```json
{
  "sessionId": "unique-session-id",
  "phoneNumber": "+254712345678",
  "text": "" // Empty for initial menu, or "*" delimited selections
}
```

**Response:**
Plain text USSD formatted response:

- `CON <message>` - Continue to next step
- `END <message>` - End session

### GET /ussd/health

Health check endpoint for the USSD service.

**Response:**

```json
{
  "status": "running",
  "timestamp": "2026-04-16T10:30:00.000Z",
  "service": "USSD Service"
}
```

## USSD Flow

The service implements an 8-step flow for reporting water/hydro issues:

### Step 0: Main Menu

```
Welcome to KTDA Hydro Issues Portal.
1. Report an issue
2. Register parcel
```

### Step 1: User Type Detection

- **Registered User**: Shows welcome message and plot selection
- **New User**: Asks for name
- **Registration**: Directs to admin for parcel registration

### Step 2: User Info / Plot Selection

- **Existing Users**: Choose between registered plot or different plot
- **New Users**: Enter name

### Step 3: Plot Entry or Project Selection

- Enters plot number/landmark
- Loads available projects from database

### Step 4: Issue Type Selection

```
Select the issue type:
1. Water Shortage
2. Low Pressure
3. Service Interruption
4. Canal Overflow
5. Equipment Damage
6. Other
```

### Step 5: Description Prompt

- Existing issue types: Ask if user wants to provide details
- Custom issue types: Ask for custom issue name

### Step 6: Description Input

- Optionally receive detailed description

### Step 7-8: Severity Selection

```
How severe is the issue?
1. Low
2. Medium
3. High
```

### Final: Submission

- Creates complaint record in database
- Returns complaint ID
- Clears session

## Database Integration

The service directly queries and mutates these Prisma models:

### Owner Model

```typescript
const owner = await prisma.owner.findFirst({
  where: { phone: phoneNumber }
})
```

Used to check if user is registered and retrieve their details.

### Project Model

```typescript
const projects = await prisma.project.findMany({
  select: { id: true, name: true }
})
```

Fetches available projects for the complaint.

### Complaint Model

```typescript
const complaint = await prisma.complaint.create({
  data: {
    phoneNumber,
    name,
    complaintType,
    description,
    plotNumber,
    projectId,
    severity,
  }
})
```

Stores the submitted complaint.

## Session Management

Sessions are maintained in-memory using a `sessionCache` object:

```typescript
const sessionCache: Record<string, any> = {}
```

**Session Data Structure:**

```typescript
{
  phoneNumber: string
  startTime: number
  isNewUser?: boolean
  userName?: string
  owner?: OwnerRecord
  plotNumber?: string
  skipPlotSelection?: boolean
  projects?: ProjectRecord[]
  selectedProject?: ProjectRecord
  issueType?: string
  customIssueType?: string
  description?: string
  severity?: string
}
```

### Production Considerations

⚠️ **Important**: The current in-memory session cache is suitable for development but has limitations:

1. **Single Instance**: Sessions will be lost if the server restarts
2. **Memory Growth**: Long-running servers may accumulate stale sessions
3. **Distributed Deployment**: Sessions won't be shared across multiple instances

**For Production**, migrate to Redis:

```typescript
import Redis from "ioredis"

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
})

// Store session
await redis.setex(sessionId, 3600, JSON.stringify(session)) // 1 hour TTL

// Retrieve session
const sessionData = await redis.get(sessionId)
const session = sessionData ? JSON.parse(sessionData) : null
```

## Configuration

No additional environment variables are required. The service uses:

- Database connection: Inherited from Fastify's Prisma plugin
- Session TTL: No expiration (configure before production)

## Testing

### Test USSD Session

```bash
# Start the API server
cd v4/apps/api
npm run dev

# Test initial menu
curl -X POST http://localhost:3001/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-123",
    "phoneNumber": "+254712345678",
    "text": ""
  }'

# Response: Main menu prompt

# Test menu selection (report issue)
curl -X POST http://localhost:3001/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-123",
    "phoneNumber": "+254712345678",
    "text": "1"
  }'

# Continue flow with subsequent selections
```

### Full Test Scenario

**New User Flow:**

```
1. POST /ussd {"text": ""} → Main menu
2. POST /ussd {"text": "1"} → Ask for name
3. POST /ussd {"text": "1*John Doe"} → Ask for plot
4. POST /ussd {"text": "1*John Doe*Plot 42"} → Show projects
5. POST /ussd {"text": "1*John Doe*Plot 42*1"} → Show issue types
6. POST /ussd {"text": "1*John Doe*Plot 42*1*1"} → Ask for description
7. POST /ussd {"text": "1*John Doe*Plot 42*1*1*1"} → Get description
8. POST /ussd {"text": "1*John Doe*Plot 42*1*1*1*Water is not flowing"} → Ask severity
9. POST /ussd {"text": "1*John Doe*Plot 42*1*1*1*Water is not flowing*2"} → Success
```

**Registered User Flow:**

```
1. POST /ussd {"text": ""} → Main menu
2. POST /ussd {"text": "1"} → Welcome back [name]
3. POST /ussd {"text": "1*1"} → Show projects
4. Continue from step 5 of new user flow...
```

## Error Handling

All errors are caught and logged with user-friendly USSD responses:

- **Invalid Project Input**: "Invalid project selection. Please try again"
- **Database Error**: "Sorry, we could not process your report. Please try again later"
- **System Error**: "An error occurred. Please try again later"

## Future Enhancements

1. **SMS Notifications**: Send confirmation via SMS after complaint submission
2. **Callback URL**: Support `callbackUrl` parameter for async responses
3. **Rate Limiting**: Prevent spam/abuse by IP or phone number
4. **Complaint Status Tracking**: Allow users to check complaint status via USSD
5. **Media Upload**: Support image attachments for issues
6. **Multi-language Support**: Localized USSD menus based on locale
7. **Redis Integration**: Production-ready session management
8. **Metrics**: Track complaint types, severity, project distribution
9. **Integration Tests**: Automated USSD flow testing suite
10. **Webhook Notifications**: Alert admins of high-severity complaints

## Files Changed

- `/apps/api/src/services/ussdService.ts` - New USSD service module
- `/apps/api/src/app.ts` - Registered ussdService plugin
- `/apps/ussd-service/` - (Deprecated) Old standalone service can be removed

## Migration Notes

If you had the standalone USSD service running before:

1. Stop the USSD service server
2. Remove `/apps/ussd-service` directory (optional)
3. Restart the API server - USSD endpoints will be available at `/ussd`
4. Update any USSD gateway configurations to point to the new endpoint URL

No data migration is needed as the service uses the same Prisma schema.
