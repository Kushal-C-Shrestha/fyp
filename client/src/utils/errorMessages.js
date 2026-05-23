export const SESSION_EXPIRED_MESSAGE = "Session expired. Please log in again.";

const AUTH_EXPIRED_PATTERNS = [
  /jwt\s+expired/i,
  /token\s+expired/i,
  /access\s+token\s+expired/i,
  /session\s+expired/i,
  /invalid\s+token/i,
];

export const isSessionExpiredText = (value = "") => {
  const text = String(value || "");
  return AUTH_EXPIRED_PATTERNS.some((pattern) => pattern.test(text));
};

const getCandidateMessages = (error) => {
  if (!error) return [];
  if (typeof error === "string") return [error];

  return [
    error?.response?.data?.message,
    error?.response?.data?.error,
    error?.response?.data?.detail,
    error?.message,
    error?.error,
    error?.detail,
  ].filter(Boolean);
};

export const getSafeErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  const candidates = getCandidateMessages(error);
  if (candidates.some(isSessionExpiredText)) return SESSION_EXPIRED_MESSAGE;
  return candidates[0] || fallback;
};
