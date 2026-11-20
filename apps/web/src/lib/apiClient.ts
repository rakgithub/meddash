const API_BASE_URL = "/api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Prefers the server's `{ error: { message } }` so callers can show why a request failed. */
async function toApiError(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Not JSON (e.g. a proxy error page): fall back to the status text.
  }
  const message =
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "object" &&
    body.error !== null &&
    "message" in body.error &&
    typeof body.error.message === "string"
      ? body.error.message
      : res.statusText;
  return new ApiError(res.status, message);
}

async function send(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (!res.ok) throw await toApiError(res);
  return res;
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await send(path, init);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const res = await send(path, {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

/** For endpoints that answer 204 No Content. */
export async function apiPostNoContent(path: string, init?: RequestInit): Promise<void> {
  await send(path, { ...init, method: "POST" });
}

export async function apiPatch<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const res = await send(path, {
    ...init,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

/** For DELETE endpoints that answer with a JSON body. */
export async function apiDelete<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await send(path, { ...init, method: "DELETE" });
  return res.json() as Promise<T>;
}
