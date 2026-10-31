import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

// keyed-backend via the same-origin /api rewrite (next.config.ts). The session is
// the backend's httpOnly access_token/refresh_token cookies; JS never sees a token.
//
// Always "/api", never NEXT_PUBLIC_API_URL directly: a cross-origin call would neither
// store the login cookies nor send them, so every request after login/ would be signed out.
export const api = axios.create({
  baseURL: "/api",
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

// Access tokens live 10s. On an expired one the backend's middleware answers 401 and
// clears the access cookie, so refresh/ (which only needs the refresh cookie) works next.
// Concurrent 401s share one refresh call.
let refreshing: Promise<unknown> | null = null;

const refreshSession = (): Promise<unknown> =>
  (refreshing ??= api.post("/refresh/", null, { _retried: true } as object).finally(() => {
    refreshing = null;
  }));

// DRF errors: { detail } or { field: ["msg", ...] }; the auth views use { error }
function errorMessage(data: unknown) {
  if (!data || typeof data !== "object") return;
  const body = data as Record<string, unknown>;
  for (const value of [body.error, body.message, body.detail, ...Object.values(body)]) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    // Retry once after refreshing. If the refresh token is dead too, the retry
    // fails on its own (401/403) and the caller treats that as signed out.
    // ponytail: a wrong password on login/ is also a 401, so it's sent twice
    if (error.response?.status === 401 && config && !config._retried) {
      config._retried = true;
      await refreshSession().catch(() => undefined);
      return api(config);
    }

    const message =
      errorMessage(error.response?.data) ?? error.message ?? "Something went wrong";
    return Promise.reject(new Error(message, { cause: error }));
  }
);

/** Status of a failed request, e.g. 401/403 means signed out */
export const errorStatus = (error: unknown) =>
  ((error as Error | undefined)?.cause as AxiosError | undefined)?.response?.status;

/** Per-field messages from a DRF 400, e.g. { email: "This field is required." } */
export function fieldErrors(error: Error): Record<string, string> {
  const data = (error.cause as AxiosError | undefined)?.response?.data;
  if (!data || typeof data !== "object") return {};
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, v]) => Array.isArray(v) && typeof v[0] === "string")
      .map(([k, v]) => [k, v[0]])
  );
}
