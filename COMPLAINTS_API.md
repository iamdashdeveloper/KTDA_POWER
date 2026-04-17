# Complaints API Documentation

## Overview

The Complaints API is designed for USSD applications to allow users to report issues and complaints caused by hydro projects. The API is optimized for simple, phone-number-based identification without requiring user authentication via the web portal.

## Database Schema

### Complaint Model

```prisma
model Complaint {
  id                 String                   @id @default(cuid())
  phoneNumber        String
  complaintType      String
  description        String
  plotNumber         String?
  name               String
  projectId          String
  severity           String                   @default("medium")
  status             String                   @default("open")
  metadata           Json                     @default("{}")
  createdAt          DateTime                 @default(now())
  updatedAt          DateTime                 @updatedAt
  project            Project                  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  feedbacks          Feedback[]
}
```

### Key Features

- **phoneNumber**: Direct identifier for USSD users (no authentication required)
- **complaintType**: Type of complaint (e.g., "water shortage", "low pressure", "service interruption")
- **description**: Detailed description of the issue
- **name**: Reporter's name
- **plotNumber**: Optional plot/property number affected by the issue
- **projectId**: Associated hydro project (Foreign Key to Project model)
- **severity**: Complaint severity - "low", "medium", "high" (default: "medium")
- **status**: Current status - "open", "pending", "closed" (default: "open")
- **metadata**: JSON field for storing additional data (createdVia, timestamp, etc.)

---

## API Endpoints

### 1. Create a Complaint

**POST** `/complaints`

Create a new complaint (USSD API endpoint)

#### Request Body

```json
{
  "phoneNumber": "+256701234567",
  "complaintType": "water_shortage",
  "description": "No water supply for the past 3 days in the village",
  "name": "John Doe",
  "projectId": "proj_123abc",
  "plotNumber": "P-2024-001",
  "severity": "high"
}
```

#### Required Fields

- `phoneNumber` (string): Reporter's phone number
- `complaintType` (string): Type of complaint
- `description` (string): Detailed description
- `name` (string): Reporter's name
- `projectId` (string): Associated project ID

#### Optional Fields

- `plotNumber` (string): Plot/property number
- `severity` (string): "low" | "medium" | "high" (default: "medium")

#### Response

```json
{
  "success": true,
  "complaintId": "cmp_abc123def456",
  "message": "Complaint submitted successfully",
  "complaint": {
    "id": "cmp_abc123def456",
    "phoneNumber": "+256701234567",
    "complaintType": "water_shortage",
    "description": "No water supply for the past 3 days in the village",
    "name": "John Doe",
    "projectId": "proj_123abc",
    "plotNumber": "P-2024-001",
    "severity": "high",
    "status": "open",
    "createdAt": "2026-04-16T10:30:00Z",
    "updatedAt": "2026-04-16T10:30:00Z",
    "project": {
      "id": "proj_123abc",
      "name": "Kigezi Hydro Project",
      "description": "Main hydro power generation facility"
    }
  }
}
```

---

### 2. Get All Complaints

**GET** `/complaints`

Retrieve all complaints with optional filtering

#### Query Parameters

- `phoneNumber` (optional): Filter by reporter's phone number
- `projectId` (optional): Filter by project ID
- `status` (optional): Filter by status (open, pending, closed)
- `complaintType` (optional): Filter by complaint type

#### Example Requests

```bash
# Get all complaints
GET /complaints

# Get complaints for a specific phone number
GET /complaints?phoneNumber=%2B256701234567

# Get open complaints for a project
GET /complaints?projectId=proj_123abc&status=open

# Get water shortage complaints
GET /complaints?complaintType=water_shortage
```

#### Response

```json
{
  "success": true,
  "count": 15,
  "complaints": [
    {
      "id": "cmp_abc123def456",
      "phoneNumber": "+256701234567",
      "complaintType": "water_shortage",
      "description": "No water supply for 3 days",
      "name": "John Doe",
      "plotNumber": "P-2024-001",
      "severity": "high",
      "status": "open",
      "createdAt": "2026-04-16T10:30:00Z",
      "project": {
        "id": "proj_123abc",
        "name": "Kigezi Hydro Project",
        "description": "Main facility"
      },
      "feedbacks": []
    }
  ]
}
```

---

### 3. Get Complaint by ID

**GET** `/complaints/:id`

Retrieve a specific complaint with all feedback

#### Parameters

- `id` (string): Complaint ID

#### Response

```json
{
  "success": true,
  "complaint": {
    "id": "cmp_abc123def456",
    "phoneNumber": "+256701234567",
    "complaintType": "water_shortage",
    "description": "No water supply",
    "name": "John Doe",
    "plotNumber": "P-2024-001",
    "severity": "high",
    "status": "open",
    "metadata": {
      "createdVia": "USSD",
      "timestamp": "2026-04-16T10:30:00Z"
    },
    "createdAt": "2026-04-16T10:30:00Z",
    "updatedAt": "2026-04-16T10:30:00Z",
    "project": {
      "id": "proj_123abc",
      "name": "Kigezi Hydro Project",
      "description": "Main facility"
    },
    "feedbacks": [
      {
        "id": "fb_123",
        "feedbackType": "update",
        "message": "We are investigating this issue",
        "createdAt": "2026-04-16T11:00:00Z"
      }
    ]
  }
}
```

---

### 4. Get Complaints by Phone Number (USSD API)

**GET** `/complaints/phone/:phoneNumber`

Retrieve all complaints for a specific phone number (ideal for USSD)

#### Parameters

- `phoneNumber` (string): Reporter's phone number (URL encoded)

#### Example Request

```bash
GET /complaints/phone/%2B256701234567
```

#### Response

```json
{
  "success": true,
  "phoneNumber": "+256701234567",
  "count": 5,
  "complaints": [
    {
      "id": "cmp_abc123def456",
      "complaintType": "water_shortage",
      "description": "No water supply",
      "status": "open",
      "severity": "high",
      "createdAt": "2026-04-16T10:30:00Z",
      "project": {
        "id": "proj_123abc",
        "name": "Kigezi Hydro Project"
      },
      "feedbacks": []
    }
  ]
}
```

---

### 5. Update Complaint

**PATCH** `/complaints/:id`

Update complaint status and other fields

#### Parameters

- `id` (string): Complaint ID

#### Request Body (all optional)

```json
{
  "status": "pending",
  "severity": "medium",
  "description": "Updated description",
  "name": "Jane Smith"
}
```

#### Allowed Updates

- `status`: "open" | "pending" | "closed"
- `severity`: "low" | "medium" | "high"
- `description`: string
- `name`: string

#### Response

```json
{
  "success": true,
  "message": "Complaint updated successfully",
  "complaint": {
    "id": "cmp_abc123def456",
    "status": "pending",
    "severity": "medium",
    "...": "..."
  }
}
```

---

### 6. Delete Complaint

**DELETE** `/complaints/:id`

Delete a complaint

#### Parameters

- `id` (string): Complaint ID

#### Response

```json
{
  "success": true,
  "message": "Complaint deleted successfully"
}
```

#### Error Response (404)

```json
{
  "error": "Complaint not found"
}
```

---

### 7. Add Feedback to Complaint

**POST** `/complaints/:id/feedback`

Add feedback or comment to a complaint

#### Parameters

- `id` (string): Complaint ID

#### Request Body

```json
{
  "feedbackType": "update",
  "message": "We are investigating this issue. Please wait for updates.",
  "rating": 3
}
```

#### Body Fields

- `feedbackType` (string): Type of feedback (update, resolution, note, etc.)
- `message` (string): Feedback message
- `rating` (number, optional): Rating (1-5)

#### Response

```json
{
  "success": true,
  "message": "Feedback added successfully",
  "feedback": {
    "id": "fb_123abc",
    "complaintId": "cmp_abc123def456",
    "feedbackType": "update",
    "message": "We are investigating this issue...",
    "rating": 3,
    "createdAt": "2026-04-16T11:00:00Z",
    "updatedAt": "2026-04-16T11:00:00Z"
  }
}
```

---

### 8. Get All Feedbacks for a Complaint

**GET** `/complaints/:id/feedbacks`

Retrieve all feedback for a specific complaint

#### Parameters

- `id` (string): Complaint ID

#### Response

```json
{
  "success": true,
  "complaintId": "cmp_abc123def456",
  "count": 3,
  "feedbacks": [
    {
      "id": "fb_123",
      "feedbackType": "update",
      "message": "Issue under investigation",
      "createdAt": "2026-04-16T11:00:00Z"
    },
    {
      "id": "fb_124",
      "feedbackType": "resolution",
      "message": "Issue resolved",
      "createdAt": "2026-04-16T15:00:00Z"
    }
  ]
}
```

---

### 9. Get Complaints by Project

**GET** `/complaints/project/:projectId`

Get all complaints for a specific project with statistics

#### Parameters

- `projectId` (string): Project ID

#### Response

```json
{
  "success": true,
  "projectId": "proj_123abc",
  "stats": {
    "total": 42,
    "byStatus": {
      "open": 15,
      "pending": 12,
      "closed": 15
    },
    "bySeverity": {
      "low": 10,
      "medium": 22,
      "high": 10
    }
  },
  "complaints": [
    {
      "id": "cmp_abc123def456",
      "phoneNumber": "+256701234567",
      "complaintType": "water_shortage",
      "description": "No water supply",
      "status": "open",
      "severity": "high",
      "createdAt": "2026-04-16T10:30:00Z",
      "project": {
        "id": "proj_123abc",
        "name": "Kigezi Hydro Project"
      },
      "feedbacks": []
    }
  ]
}
```

---

## USSD Integration Guide

### Example USSD Flow

```
1. User sends: "complaint"

2. System responds:
   "Report an issue with project service?
   1. Water shortage
   2. Low pressure
   3. Service interruption
   4. Other"

3. User selects: "1"

4. System asks: "Describe the issue:"

5. User responds: "No water for 3 days"

6. System asks: "Your name:"

7. User responds: "John Doe"

8. System asks: "Which project?"
   "1. Kigezi Hydro
   2. Mulange Hydro
   3. Other"

9. User selects: "1"

10. System responds:
    "Complaint submitted successfully.
    Reference: cmp_abc123def456
    Thank you!"
```

### Sample USSD Request (Backend)

```bash
curl -X POST http://localhost:3001/complaints \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+256701234567",
    "complaintType": "water_shortage",
    "description": "No water for 3 days",
    "name": "John Doe",
    "projectId": "proj_123abc",
    "severity": "high"
  }'
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request - Missing Required Fields

```json
{
  "error": "Missing required fields: phoneNumber, complaintType, description, name, projectId"
}
```

#### 404 Not Found

```json
{
  "error": "Complaint not found"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Failed to create complaint",
  "details": "Database connection error"
}
```

---

## Status Codes

| Code | Status                | Description                 |
| ---- | --------------------- | --------------------------- |
| 200  | OK                    | Successful GET request      |
| 201  | Created               | Successful POST/PUT request |
| 400  | Bad Request           | Invalid input data          |
| 404  | Not Found             | Resource not found          |
| 500  | Internal Server Error | Server-side error           |

---

## Best Practices

1. **Phone Number Format**: Always include country code (e.g., +256 for Uganda)
2. **URL Encoding**: Phone numbers with special characters should be URL encoded
3. **Complaint Types**: Use consistent complaint type values across your USSD service
4. **Response Handling**: Always check for the `success` flag in responses
5. **Feedback**: Regularly add feedback/updates to keep complainants informed
6. **Status Updates**: Update complaint status from "pending" to "closed" once resolved

---

## Examples

### Complete Complaint Lifecycle

```bash
# 1. Create complaint
POST /complaints
{
  "phoneNumber": "+256701234567",
  "complaintType": "water_shortage",
  "description": "No water supply",
  "name": "John Doe",
  "projectId": "proj_123abc",
  "severity": "high"
}
# Response: {"success": true, "complaintId": "cmp_abc123"}

# 2. Check complaint status
GET /complaints/cmp_abc123
# Response: complaint details with status "open"

# 3. Add feedback/investigation update
POST /complaints/cmp_abc123/feedback
{
  "feedbackType": "update",
  "message": "We are investigating the issue"
}

# 4. Close complaint
PATCH /complaints/cmp_abc123
{
  "status": "closed"
}
# Response: complaint with status "closed"
```

---

## Future Enhancements

- [ ] Image/attachment support for complaints
- [ ] SMS notifications for status updates
- [ ] Complaint priority level system
- [ ] Integration with issue tracking system
- [ ] Analytics dashboard for project managers
- [ ] Machine learning for complaint categorization
