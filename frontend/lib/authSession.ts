export const COOKIE_AUTH_TOKEN = "__pulsa_cookie_session__";

const SESSION_HINT_KEY = "pulsa_session_active";
const LEGACY_SESSION_TOKEN_KEY = "rf_token";
const LEGACY_LOCAL_TOKEN_KEY = "pulsa_token";

export function rememberSession() {
  window.localStorage.setItem(SESSION_HINT_KEY, "1");
  window.sessionStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_LOCAL_TOKEN_KEY);
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_HINT_KEY);
  window.sessionStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_LOCAL_TOKEN_KEY);
}

export function hasSessionHint() {
  return window.localStorage.getItem(SESSION_HINT_KEY) === "1";
}
