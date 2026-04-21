type ClassValue = string | undefined | null | Record<string, boolean>

export function cn(...classes: ClassValue[]) {
  return classes
    .filter((cls): cls is string => typeof cls === "string" && cls.length > 0)
    .join(" ")
}
