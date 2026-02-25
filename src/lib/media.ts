export function safeLocalPath(path?: string | null, fallback = "/images/default.png") {
  if (!path) return fallback;
  if (path.startsWith("http")) return fallback;
  return path;
}
