import {
  getCookie,
  getQuery,
  getRequestURL,
  sendRedirect,
  setCookie,
} from "h3";

const BYPASS_COOKIE = "maintenance_bypass";

function normalizeFlag(value: unknown): boolean {
  const input = String(value ?? "")
    .trim()
    .toLowerCase();
  return input === "1" || input === "true" || input === "on" || input === "yes";
}

function shouldSkip(pathname: string): boolean {
  return (
    pathname === "/maintenance.html" ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/_nuxt/")
  );
}

export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  if (shouldSkip(url.pathname)) {
    return;
  }

  const config = useRuntimeConfig(event);
  const modeOn = normalizeFlag(
    process.env.MAINTENANCE_MODE ??
      process.env.NUXT_MAINTENANCE_MODE ??
      config.maintenanceMode,
  );

  const hasFirebaseConfig = Boolean(
    config.public.firebaseApiKey &&
    config.public.firebaseAuthDomain &&
    config.public.firebaseProjectId &&
    config.public.firebaseAppId &&
    config.public.firebaseStorageBucket &&
    config.public.firebaseMessagingSenderId,
  );

  const maintenanceEnabled = modeOn || !hasFirebaseConfig;
  if (!maintenanceEnabled) {
    return;
  }

  const bypassToken = String(
    process.env.MAINTENANCE_BYPASS_TOKEN ??
      process.env.NUXT_MAINTENANCE_BYPASS_TOKEN ??
      config.maintenanceBypassToken ??
      "",
  ).trim();
  const query = getQuery(event);
  const bypassFromQuery = typeof query.bypass === "string" ? query.bypass : "";

  if (bypassToken && bypassFromQuery === bypassToken) {
    setCookie(event, BYPASS_COOKIE, bypassToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 12,
    });
    return sendRedirect(event, url.pathname, 302);
  }

  const hasBypassCookie =
    bypassToken && getCookie(event, BYPASS_COOKIE) === bypassToken;
  if (hasBypassCookie) {
    return;
  }

  return sendRedirect(event, "/maintenance.html", 307);
});
