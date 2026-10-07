/**
 * Safely normalizes any input to a displayable name string.
 * Accepts string, object ({ name, login, username, email, author, authorName, authorLogin, displayName, fullName }),
 * number, null, undefined.
 * Always returns a non-empty string, falling back to 'Unknown'.
 * Never throws an exception.
 *
 * @param {*} value
 * @param {string} [fallback="Unknown"]
 * @returns {string}
 */
export function toDisplayName(value, fallback = "Unknown") {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const candidate =
      value.name ||
      value.authorName ||
      value.author ||
      value.displayName ||
      value.fullName ||
      value.login ||
      value.authorLogin ||
      value.username ||
      value.email;
    if (candidate) {
      return toDisplayName(candidate, fallback);
    }
  }
  const str = String(value ?? "").trim();
  return str.length > 0 && str !== "[object Object]" ? str : fallback;
}
