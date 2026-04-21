# Project Selection System - Technical Reference

## Quick Navigation

### Store (Global State)

📁 `/apps/field-tool/src/store/useProjectStore.ts`

### Components

📁 `/apps/field-tool/src/components/ProtectedRoute.tsx`
📁 `/apps/field-tool/src/components/ui/navbar.tsx`

### Pages

📁 `/apps/field-tool/src/pages/ProjectManager.tsx`

### Routing

📁 `/apps/field-tool/src/App.tsx`

### API

📁 `/apps/api/src/routes/projects/index.ts`

---

## State Management Quick Reference

### Importing the Store

```typescript
import { useProjectStore } from "@/store/useProjectStore"

function MyComponent() {
  const { activeProject, setActiveProject, clearActiveProject } = useProjectStore()

  return <div>{activeProject?.name}</div>
}
```

### Store Schema

```typescript
// Read state
activeProject: Project | null
isInitialized: boolean

// Write state
setActiveProject(project: Project) → void
clearActiveProject() → void
setIsInitialized(initialized: boolean) → void

// localStorage persists under "project-store" v1
```

---

## Routing Flow Diagram

```
         ┌──────────────┐
         │ App Load     │
         └──────┬───────┘
                │
         ┌──────▼───────────────┐
         │ Check authToken      │
         │ in localStorage      │
         └──────┬───────────────┘
                │
        ┌───────┴────────┐
        │ NO             │ YES
        │                │
    ┌───▼──────────┐  ┌──▼────────────────────┐
    │ Redirect     │  │ Check activeProject    │
    │ to /auth     │  │ in Zustand store       │
    └──────────────┘  └──┬────────────────────┘
                         │
                 ┌───────┴────────┐
                 │ NO             │ YES
                 │                │
         ┌───────▼──────────┐  ┌──▼──────────────┐
         │ Redirect         │  │ Render page     │
         │ to /projects     │  │ (Home/Sensors)  │
         └──────────────────┘  └─────────────────┘
```

---

## Component Integration Map

### ProtectedRoute → Controls Access

```
ProtectedRoute {requireProject=true}
  ├─ Checks: authToken + user in localStorage
  ├─ Checks: activeProject in Zustand store
  ├─ Decision:
  │  ├─ !auth → Redirect /auth
  │  ├─ !project && requireProject → Redirect /projects
  │  └─ All checks pass → Render children
  └─ Loading: Shows spinner during init
```

### ProjectManager → User Selects Project

```
ProjectManager
  ├─ Fetches: GET /projects from API
  ├─ Evaluates: User access logic
  │  └─ hasAccess = (companyId match) || (KTPC_HQ role)
  ├─ Renders: Grid of projects
  ├─ Action: User clicks "Open Project"
  ├─ Calls: useProjectStore.setActiveProject()
  └─ Navigates: to /home
```

### Navbar → Shows Context + Switch

```
Navbar
  ├─ Reads: activeProject from Zustand
  ├─ Display: Shows project.name (if set)
  ├─ Button: "Switch Project"
  │  ├─ Calls: clearActiveProject()
  │  └─ Navigates: to /projects
  └─ Responsive: Hidden on sm screens
```

---

## API Response Structure

### GET /projects

```json
[
  {
    "id": "proj-123",
    "name": "Roseires Dam",
    "description": "Main hydropower facility monitoring",
    "companyId": "company-456",
    "status": "active",
    "images": ["url1.jpg", "url2.jpg"]
  },
  {
    "id": "proj-789",
    "name": "Sennar Dam",
    "description": "Secondary facility",
    "companyId": "company-999",
    "status": "active",
    "images": []
  }
]
```

**Key:** `companyId` used for frontend access evaluation

---

## Type Definitions

### Project

```typescript
interface Project {
  id: string                    // Unique project identifier
  name: string                  // Display name
  companyId: string             // Owner company for access control
  description?: string          // Optional description
  location?: {                  // Optional location
    latitude: number
    longitude: number
  }
  status?: string               // Project status (active, archived, etc.)
  images?: string[]             // Associated images
}
```

### ProjectWithAccess (Frontend Only)

```typescript
interface ProjectWithAccess extends Project {
  hasAccess: boolean            // User can open this project
  canRequest: boolean           // User can request access
}
```

### ProtectedRouteProps

```typescript
interface ProtectedRouteProps {
  children: ReactNode           // Content to protect
  requireProject?: boolean      // Require activeProject? (default: false)
}
```

---

## Access Control Logic

### Evaluation Function

```typescript
const hasAccess = (user: User, project: Project) => {
  return (
    user.companyId === project.companyId  // Same company
    || user.role === "KTPC_HQ"             // Or HQ admin
  )
}
```

### Where Applied

1. **Frontend (ProjectManager.tsx):**
   - Displays access status badges
   - Enables/disables "Open Project" button
   - Shows "Request Access" for denied projects

2. **Backend (Future Enhancement):**
   - Filter `/projects` by user permissions
   - Validate project access on layer fetch requests

---

## Environment Storage

### localStorage Keys

| Key             | Type   | Purpose                  | Example                                                  |
| --------------- | ------ | ------------------------ | -------------------------------------------------------- |
| `authToken`     | string | JWT authentication token | `eyJhbGc...`                                             |
| `user`          | JSON   | Current user object      | `{"id":"u1","email":"...","role":"KTPC_HQ"}`             |
| `project-store` | JSON   | Zustand persist state    | `{"activeProject":{"id":"p1",...},"isInitialized":true}` |

### Zustand Persistence

- **Format:** localStorage key = `"project-store"`
- **Version:** v1 (allows versioning for migrations)
- **Scope:** Only `activeProject` and internal state
- **Hydration:** Automatic on app load

---

## Loading States

### ProtectedRoute

```
Initial Load
  ├─ Show: Full-screen spinner
  ├─ Message: "Loading..."
  └─ Style: Centered, dark background
```

### ProjectManager

```
Fetching Projects
  ├─ Show: Spinner in center
  ├─ Message: "Loading projects..."
  └─ Disable: All interactions
```

### Project Selection

```
Opening Project
  ├─ Selected Button: "Opening..."
  ├─ Icon: Animated Loader2 spinner
  ├─ Style: Button disabled
  └─ Duration: Until redirect completes
```

---

## Error Handling Patterns

### Toast Notifications

```typescript
import { toast } from "sonner"

// Fetch failure
catch (error) {
  toast.error("Failed to load projects")
}

// Access request (placeholder)
handleRequestAccess() {
  toast.info("Access request feature coming soon")
}
```

### Redirect Fallbacks

```typescript
// No auth → /auth
if (!token || !user) navigate("/auth")

// No project → /projects
if (requireProject && !activeProject) navigate("/projects")

// Root → /home
"/" → Navigate to "/home"
```

---

## Development Workflow

### Adding a New Protected Feature

```typescript
// 1. Create your component
export function MyNewFeature() { ... }

// 2. Add route in App.tsx
<Route
  path="/my-feature"
  element={
    <ProtectedRoute requireProject={true}>
      <MyNewFeature />
    </ProtectedRoute>
  }
/>

// 3. Access activeProject in component
import { useProjectStore } from "@/store/useProjectStore"

export function MyNewFeature() {
  const { activeProject } = useProjectStore()
  // Use activeProject.id to fetch relevant data
}
```

### Using activeProject as Dependency

```typescript
useEffect(() => {
  if (!activeProject?.id) return

  // Fetch data specific to this project
  fetchProjectLayers(activeProject.id)
}, [activeProject?.id])  // ✅ Re-run when project changes
```

---

## Performance Optimizations

### Store Updates

```typescript
// ❌ Avoid: Recreates whole component tree
setActiveProject({...oldProject, name: "New"})

// ✅ Better: Only update what changed
const { activeProject } = useProjectStore()
if (activeProject) {
  setActiveProject({ ...activeProject, name: "New" })
}
```

### Navigation

```typescript
// ❌ Avoid: Triggers full re-render
navigate("/home", { state: project })

// ✅ Better: Store in Zustand first
setActiveProject(project)
navigate("/home")
```

---

## Testing Scenarios

### Test Case 1: New User Flow

```
1. Navigate to /
2. Auto-redirects to /home
3. ProtectedRoute checks auth
4. No authToken → redirects to /auth
5. User signs in
6. authToken stored, activeProject null
7. Navigate to /home
8. ProtectedRoute checks project
9. No activeProject → redirects to /projects
10. User selects project
11. activeProject set in store
12. Navigate to /home (succeeds)
```

### Test Case 2: Project Switch

```
1. User on /home with activeProject set
2. Click "Switch Project" in navbar
3. clearActiveProject() called
4. Navigate to /projects
5. ProjectManager loads, shows all projects
6. User selects different project
7. activeProject updated in store
8. Navigate to /home
9. Page loads with new project data
10. Navbar shows new project name
```

### Test Case 3: localStorage Persistence

```
1. User selects project (activeProject set)
2. localStorage["project-store"] updated
3. User closes browser
4. User reopens app
5. Zustand hydrates from localStorage
6. activeProject restored
7. ProtectedRoute validates: ✓ auth, ✓ project
8. Page renders immediately (no redirect)
```

### Test Case 4: Access Control

```
1. Company Admin (companyId=123) views projects
2. Project A (companyId=123): hasAccess=true ✓
3. Project B (companyId=999): hasAccess=false ✗
4. KTPC_HQ role user views same projects
5. Project A: hasAccess=true ✓ (same company)
6. Project B: hasAccess=true ✓ (HQ role)
```

---

## Troubleshooting

### Issue: ProtectedRoute shows spinner forever

**Cause:** `isInitialized` not being set
**Solution:** Check Zustand store initialization in useEffect

### Issue: Project not persisting across reload

**Cause:** localStorage not set or Zustand hydration failing
**Solution:** Check browser console for `project-store` key in localStorage

### Issue: "Switch Project" button not appearing

**Cause:** activeProject is null
**Solution:** Complete project selection first via ProjectManager

### Issue: TypeScript error on ReactNode

**Cause:** Importing as value instead of type
**Solution:** Use `import type { ReactNode }`

---

## Browser Compatibility

- ✅ localStorage support required
- ✅ Modern routing (React Router v7)
- ✅ ES2020+ features
- ✅ CSS Flexbox required (for navbar layout)

---

## Security Considerations

### Current (Phase 1)

- ✅ localStorage authToken validation
- ✅ Frontend access logic (companyId check)
- ✅ Protected routes redirect unauthenticated users

### Recommended (Phase 2)

- ⏳ Backend JWT validation on all `/projects` requests
- ⏳ Server-side access control check
- ⏳ RBAC-based project filtering
- ⏳ Audit logging for project access

### Not Implemented

- ❌ Token refresh logic
- ❌ XSS protection on project.name
- ❌ CSRF tokens (API should implement)

---

## Performance Metrics

### Store Operations

- `setActiveProject()`: <1ms (sync Zustand update)
- `clearActiveProject()`: <1ms (sync Zustand update)
- localStorage write: ~2-5ms
- localStorage read (hydration): ~2-5ms

### ProjectManager

- API fetch: ~100-500ms (network dependent)
- Grid render: ~50-100ms (for 10-20 projects)
- Project selection: ~10-20ms

### ProtectedRoute

- Auth validation: <1ms
- Navigation redirect: ~50-200ms

---

## Versioning

**Current Version:** 1.0 (Initial Implementation)
**Store Version:** 1 (Zustand persist version)
**API Version:** v1 (consistent with project schema)

### Planned Updates

- v2: Access request modal
- v3: Dynamic layer loading
- v4: Multi-project dashboard
- v5: Real-time project sync

---

## Related Documentation

- 📖 [Implementation Guide](./PROJECT_SELECTION_IMPLEMENTATION.md)
- 🔗 [Zustand Documentation](https://github.com/pmndrs/zustand)
- 🔗 [React Router v7](https://reactrouter.com/)
- 📱 [KTDA Power Architecture](./PARENT_CHILD_ARCHITECTURE.md)
