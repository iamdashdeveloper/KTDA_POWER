import { toast } from "sonner"

/**
 * Get a friendly error message based on error type
 */
export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Network errors
    if (message.includes("fetch") || message.includes("network")) {
      return "Unable to connect to the server. Please check your internet connection and try again."
    }

    // Validation errors (keep specific)
    if (message.includes("validation") || message.includes("required")) {
      return error.message // Return original for validation errors
    }

    // Server errors
    if (message.includes("401") || message.includes("unauthorized")) {
      return "You don't have permission to perform this action."
    }
    if (message.includes("403") || message.includes("forbidden")) {
      return "Access denied. Please check your permissions."
    }
    if (message.includes("404") || message.includes("not found")) {
      return "The resource you're looking for doesn't exist."
    }
    if (message.includes("500") || message.includes("server error")) {
      return "Something went wrong on our end. Please try again later."
    }

    // Timeout errors
    if (message.includes("timeout")) {
      return "The request took too long. Please try again."
    }

    // Default: if it's a user-friendly message, use it
    if (
      message.includes("created") ||
      message.includes("updated") ||
      message.includes("deleted") ||
      message.includes("already exists") ||
      message.includes("select") ||
      message.includes("required")
    ) {
      return error.message
    }
  }

  return "Something went wrong. Please try again."
}

/**
 * Show a success toast
 */
export function showSuccess(message: string) {
  toast.success(message, {
    duration: 4000,
  })
}

/**
 * Show an error toast
 */
export function showError(message: string) {
  toast.error(message, {
    duration: 5000,
  })
}

/**
 * Show a warning toast
 */
export function showWarning(message: string) {
  toast.warning(message, {
    duration: 4000,
  })
}

/**
 * Handle form submission errors in a friendly way
 */
export function handleFormError(error: unknown) {
  const friendlyMessage = getFriendlyErrorMessage(error)
  showError(friendlyMessage)
}

/**
 * Handle form success with a friendly message
 */
export function handleFormSuccess(action: string) {
  const actions: Record<string, string> = {
    create: "Created successfully!",
    update: "Updated successfully!",
    delete: "Deleted successfully!",
    submit: "Submitted successfully!",
  }
  showSuccess(actions[action] || "Operation completed successfully!")
}
