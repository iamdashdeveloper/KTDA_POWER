import { UserPermissionsForm } from "@/components/forms/UserPermissionsForm"

export function Permissions() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Permissions & Access Control</h1>
        <p className="mt-2 text-muted-foreground">
          Manage user roles and assign permissions
        </p>
      </div>

      <UserPermissionsForm />
    </div>
  )
}
