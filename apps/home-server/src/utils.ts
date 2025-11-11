import path from "path";

export const sanitizeRelativePath = (
  rawValue: string | undefined | null
): string | null => {
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = path.normalize(trimmed).replace(/\\/g, "/");

  if (
    normalized === "." ||
    normalized.startsWith("/") ||
    normalized.startsWith("\\") ||
    path.isAbsolute(normalized) ||
    normalized.split("/").some((segment) => segment === ".." || segment === "")
  ) {
    return null;
  }

  return normalized;
};


