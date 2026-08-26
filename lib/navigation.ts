export const DEFAULT_PLATFORM_PATH = "/feed";

export function safeInternalPath(value: string | null | undefined): string {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.includes("://")
  ) {
    return value;
  }

  return DEFAULT_PLATFORM_PATH;
}
