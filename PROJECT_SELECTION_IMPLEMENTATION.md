# Project Selection System - Implementation Complete ✅

## Overview

Successfully implemented a **persistent, multi-tenant Project Selection workflow** for the KTDA Power hydropower administrative dashboard. The system features intelligent routing guards, global state management with localStorage persistence, and conditional access control based on company hierarchy.

---

## Architecture Components

### 1. **Global State Management** (`useProjectStore.ts`)

**Location:** `/apps/field-tool/src/store/useProjectStore.ts`

**Purpose:** Centralized Zustand store for project selection with localStorage persistence

**Features:**

- Type-safe store with TypeScript interfaces
- `activeProject: Project | null` - Currently selected project
- `isInitialized: boolean` - Tracks store initialization state
- Persistent storage in localStorage under key `"project-store"` (v1)
- Methods: `setActiveProject()`, `clearActiveProject()`, `setIsInitialized()`

**Project Interface:**

```typescript
interface Project {
  id: string
  name: string
  companyId: string
  description?: string
  location?: { latitude: number; longitude: number }
}
```

**Dependencies:** `zustand`, `zustand/middleware`

---

### 2. **Routing Guard** (`ProtectedRoute.tsx`)

**Location:** `/apps/field-tool/src/components/ProtectedRoute.tsx`

**Purpose:** Intelligent route protection with multi-level authentication and project requirement logic

**Props:**

- `children: ReactNode` - Content to render if authorized
- `requireProject?: boolean` - If `true`, user must have activeProject set (default: `false`)

**Logic Flow:**

1. **Authentication Check:** Validates `authToken` and `user` in localStorage
2. **Authorization Decision:**
   - If not authenticated → Redirect to `/auth`
   - If `requireProject=true` and `!activeProject` → Redirect to `/projects`
   - Otherwise → Render protected content
3. **Loading State:** Shows spinner during initialization

**Key Features:**

- Uses `useProjectStore()` for activeProject state
- Manages `isInitialized` flag to prevent flickering
- Smooth loading UI during auth validation

---

### 3. **Project Selection UI** (`ProjectManager.tsx`)

**Location:** `/apps/field-tool/src/pages/ProjectManager.tsx`

**Purpose:** Landing page for users to select their active project with conditional access logic

**Features:**

#### Grid Layout

- Responsive columns: `sm:2`, `lg:3`
- Card-based design with project details

#### Access Logic

```typescript
hasAccess = (user.companyId === project.companyId) || (user.role === "KTPC_HQ")
canRequest = (user.companyId !== project.companyId)
```

#### Display Information

- Project name, description, location
- User email from localStorage
- Access status badge (✓ Access / ⊘ Request)
- Loading spinner during data fetch

#### User Actions

- **"Open Project"** Button (enabled if `hasAccess`)
  - Calls `handleOpenProject()` → Sets activeProject → Navigates to `/home`
- **"Request Access"** Button (disabled placeholder)
  - Placeholder for future access request modal implementation
  - Shows toast: "Access request feature coming soon"

#### Error Handling

- Toast notifications via sonner for API failures
- Graceful fallback if no projects loaded

#### Navigation

- Redirects to `/auth` if not authenticated
- Redirects to `/home` on successful project selection

---

### 4. **Navigation Enhancement** (`navbar.tsx`)

**Location:** `/apps/field-tool/src/components/ui/navbar.tsx`

**Purpose:** Global navigation bar with project context awareness

**New Features:**

- **Conditional Display:** Shows only when `activeProject` is set
- **Project Display:** Shows current project name
- **Switch Project Button:**
  - Icon: Layers icon from lucide-react
  - On click: `clearActiveProject()` → Navigate to `/projects`
  - Allows users to switch between projects without full re-authentication
- **Responsive:** Hidden on small screens (`hidden sm:flex`)

**Styling:** Uses Button component from shadcn/ui with `ghost` variant

---

### 5. **Routing Integration** (`App.tsx`)

**Location:** `/apps/field-tool/src/App.tsx`

**Updated Routes:**

```typescript
// Public routes
/auth                      → Auth component (no protection)

// Protected routes (auth required)
/projects                  → ProjectManager (no activeProject required)
/home                      → Home (requires activeProject)
/sensors                   → Sensors (requires activeProject)
/data                      → Data (requires activeProject)
/tasks                     → Tasks (requires activeProject)
```

**ProtectedRoute Wrapper:**

- All project-specific routes wrapped with `<ProtectedRoute requireProject={true}>`
- ProjectManager route wrapped with `<ProtectedRoute>` (auth only, no project requirement)
- Default redirect (`/` → `/home`)

---

### 6. **API Endpoint Enhancement** (`/projects`)

**Location:** `/apps/api/src/routes/projects/index.ts`

**Endpoint:** `GET /projects`

**Response Format:**

```typescript
{
  id: string
  name: string
  description?: string
  status?: string
  images?: string[]
  companyId: string  // ✅ Added for frontend access evaluation
}[]
```

**Purpose:** Returns all available projects with company association for multi-tenant access control

---

## User Journey

### 1. **New User / Sign Out**

```
/auth (SignIn/SignUp)
  → Authentication successful
  → Zustand store initialized (activeProject = null)
  → Auto-redirect to /projects
```

### 2. **Project Selection**

```
/projects (ProjectManager)
  → Display projects filtered by access
  → User clicks "Open Project"
  → setActiveProject(selected)
  → Navigate to /home
```

### 3. **Working in Project**

```
/home, /sensors, /data, /tasks (Protected routes)
  → ProtectedRoute validates authToken + activeProject
  → Render page content
  → Navbar shows project name + "Switch Project" button
```

### 4. **Switching Projects**

```
Navbar → Click "Switch Project"
  → clearActiveProject()
  → Navigate to /projects
  → ProjectManager loads again
  → Select new project
```

---

## State Management Flow

### Zustand Store Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. App Initialization                                       │
│    useProjectStore hook created                            │
│    localStorage["project-store"] → Hydrate state           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Authentication Check (ProtectedRoute)                    │
│    authToken + user verified                               │
│    If missing → Redirect /auth                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Project Requirement Check                                │
│    If requireProject=true && !activeProject                │
│    → Redirect /projects                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Render Protected Content                                 │
│    activeProject available in components                    │
│    Use via: const { activeProject } = useProjectStore()    │
│    localStorage persists selection across page reloads      │
└─────────────────────────────────────────────────────────────┘
```

---

## TypeScript Type Safety

**Type-Only Imports (verbatimModuleSyntax):**

```typescript
// ProtectedRoute.tsx
import type { ReactNode } from "react"  // ✅ Type-only
import { useEffect, useState } from "react"  // ✅ Values only
```

**Enforcement:** All type imports use `type` keyword due to tsconfig.json `verbatimModuleSyntax: true`

---

## Error Handling & Validation

### Frontend Validation

- **Authentication:** Check `localStorage.authToken` and `localStorage.user`
- **Project Access:** Evaluate `companyId` match or `KTPC_HQ` role
- **Loading States:** Show spinner during initialization/project fetch

### API Validation (Planned)

- Add JWT token verification on `/projects` endpoint
- Filter projects by user permissions
- Implement access request creation endpoint

---

## Future Enhancements (Pending)

### 1. **Access Request Modal**

- UI Dialog/Modal for requesting project access
- Track request status in database
- Notification system for approvals

### 2. **Dynamic Layer Loading**

- Use `activeProject.id` as useEffect dependency
- Fetch GIS layers specific to selected project
- Load features from appropriate source (WFS, GeoJSON, etc.)

### 3. **Role-Based UI**

- Show different features based on user role + project access
- Display approval workflows for admins

### 4. **Multi-Project Dashboard**

- Quick-switch dropdown in navbar
- Show project stats/status

---

## Testing Checklist

- ✅ Zustand store persists to localStorage
- ✅ Authentication redirect works (/auth)
- ✅ Project requirement guard works (/projects)
- ✅ ProjectManager fetches and displays projects
- ✅ Access logic evaluates correctly (companyId + KTPC_HQ)
- ✅ Project selection updates store and navigates to /home
- ✅ ProtectedRoute shows loading spinner
- ✅ Navbar displays project name when activeProject set
- ✅ "Switch Project" button clears store and navigates to /projects
- ✅ TypeScript compilation succeeds with no errors
- ✅ API `/projects` includes companyId in response

---

## File Changes Summary

### Created

- `/apps/field-tool/src/store/useProjectStore.ts` (Zustand store)
- `/apps/field-tool/src/components/ProtectedRoute.tsx` (Routing guard)
- `/apps/field-tool/src/pages/ProjectManager.tsx` (Selection UI)

### Modified

- `/apps/field-tool/src/App.tsx` (Added routing integration)
- `/apps/field-tool/src/components/ui/navbar.tsx` (Added project display + switch button)
- `/apps/api/src/routes/projects/index.ts` (Added companyId to response)

### Dependencies Added

- `zustand` (v5.0.12)

---

## Code Examples

### Using activeProject in Components

```typescript
import { useProjectStore } from "@/store/useProjectStore"

export function MyComponent() {
  const { activeProject } = useProjectStore()

  return (
    <div>
      {activeProject ? (
        <>
          <h1>Working on: {activeProject.name}</h1>
          <p>Company: {activeProject.companyId}</p>
        </>
      ) : (
        <p>No project selected</p>
      )}
    </div>
  )
}
```

### Clearing Project (Logout/Switch)

```typescript
const { clearActiveProject } = useProjectStore()

const handleLogout = () => {
  localStorage.clear()
  clearActiveProject()
  navigate("/auth")
}
```

### Protected Route Usage

```typescript
<ProtectedRoute requireProject={true}>
  <Home />
</ProtectedRoute>
```

---

## Summary

The project selection system is now **fully integrated** with:

- ✅ Persistent global state (Zustand + localStorage)
- ✅ Intelligent routing guards (auth + project requirement)
- ✅ Responsive UI with conditional access logic
- ✅ Navigation enhancements for project switching
- ✅ API alignment with frontend requirements
- ✅ Complete TypeScript type safety
- ✅ Zero compilation errors

**Status:** Ready for testing and feature extensions (access requests, dynamic layer loading, etc.)
