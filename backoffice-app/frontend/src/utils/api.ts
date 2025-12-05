const devFallback = (() => {
  if (typeof window === "undefined") return "";
  const p = window.location.port;
  return ["5192", "5194", "5200", "5202", "5210", "5212"].includes(p)
    ? "http://localhost:8080"
    : "";
})();
const base = import.meta.env.VITE_API_BASE_URL || devFallback;
import { token } from "../hooks/useAuth";
function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(
    new RegExp(
      "(?:^|; )" +
        name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, "\\$1") +
        "=([^;]*)"
    )
  );
  return m ? decodeURIComponent(m[1]) : "";
}

async function apiFetch(path: string, init?: RequestInit) {
  const csrf = getCookie("csrf_token");
  const headers = new Headers(init?.headers as HeadersInit);
  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (token.value) headers.set("Authorization", `Bearer ${token.value}`);
  if (csrf) headers.set("X-CSRF-Token", csrf);

  const fullUrl = base + path;
  console.log("API Request:", {
    url: fullUrl,
    method: init?.method || "GET",
    headers: {
      "Content-Type": headers.get("Content-Type"),
      Authorization: headers.get("Authorization") ? "Bearer [REDACTED]" : null,
      "X-CSRF-Token": csrf ? "[CSRF_TOKEN]" : null,
    },
    hasToken: !!token.value,
    hasCSRF: !!csrf,
  });

  const intde: RequestInit = { ...init, headers, credentials: "include" };
  const res = await fetch(fullUrl, intde);

  console.log("API Response:", {
    url: fullUrl,
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    contentType: res.headers.get("content-type"),
  });

  const isJson = (res.headers.get("content-type") || "").includes(
    "application/json"
  );
  if (!res.ok) {
    const err = isJson
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");
    const msg = typeof err === "string" ? err : err?.error || "Request failed";
    console.error("API Error:", {
      url: fullUrl,
      status: res.status,
      error: err,
      message: msg,
    });
    throw new Error(msg);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const json = await res.json();
    console.log("API Success Response:", {
      url: fullUrl,
      data: json,
    });
    return json;
  }
  return res.text();
}

export function loginAdmin(email: string, password: string) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
export function apiRegister(email: string, password: string) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
export function apiForgotPassword(email: string) {
  return apiFetch("/auth/forgot", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
export function apiVerifyEmail(token: string) {
  return apiFetch("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
export function listOutlets() {
  return apiFetch("/outlets");
}
export function listAdminUsers() {
  return apiFetch("/admin-users");
}
export function listBookings(params?: { status?: string }) {
  const q = params?.status
    ? `?status=${encodeURIComponent(params.status)}`
    : "";
  return apiFetch("/bookings" + q);
}
export function getSessionStatus(id: string) {
  return apiFetch(`/session/${id}/status`);
}
export function overrideSession(id: string, by: string) {
  return apiFetch(`/session/${id}/override`, {
    method: "POST",
    body: JSON.stringify({ admin_id: by }),
  });
}

export function getSystemConfig() {
  return apiFetch("/config/system");
}
export function updateSystemConfig(
  sessionMinutes: number,
  toleranceMinutes: number
) {
  const body = new URLSearchParams({
    session_duration_minutes: String(sessionMinutes),
    arrival_tolerance_minutes: String(toleranceMinutes),
  });
  return apiFetch("/config/system", {
    method: "PUT",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

export function createBooking(userName: string, outletName: string) {
  return apiFetch("/booking", {
    method: "POST",
    body: JSON.stringify({ user_name: userName, outlet_name: outletName }),
  });
}
export function confirmPayment(bookingId: string) {
  return apiFetch("/payment/confirm", {
    method: "POST",
    body: JSON.stringify({ booking_id: bookingId }),
  });
}
export function arrivalSession(id: string) {
  return apiFetch("/session/arrival", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}
export function startSession(id: string) {
  return apiFetch("/session/start", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}
export function finishSession(id: string) {
  return apiFetch("/session/finish", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

export function assertArray(v: any, name: string) {
  if (!Array.isArray(v)) throw new Error(`${name} invalid`);
}
export function assertObject(v: any, name: string) {
  if (typeof v !== "object" || !v) throw new Error(`${name} invalid`);
}

export function createUser(
  email: string,
  password: string,
  roleCode: "admin" | "outlet" | "kasir",
  outletId?: number
) {
  const body: any = { email, password, role_code: roleCode };
  if (typeof outletId === "number") body.outlet_id = String(outletId);
  return apiFetch("/auth/users/create", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listTransactions() {
  return apiFetch("/transactions");
}
export function createTransaction(payload: {
  amount: number;
  currency: string;
  description: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}) {
  return apiFetch("/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function validateTransaction(id: number) {
  return apiFetch("/transactions/validate", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}
export function payTransaction(id: number) {
  return apiFetch("/transactions/pay", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

export function getActiveTerms() {
  return apiFetch("/terms?active=true");
}
export function getTermsById(id: number) {
  return apiFetch(`/terms?id=${id}`);
}
export function adminCreateTerms(payload: {
  content: any;
  effective_date?: string;
  version_notes?: string;
}) {
  return apiFetch("/admin/terms", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function adminPublishTerms(id: number) {
  return apiFetch("/admin/terms/publish", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}
export function agreementStatus(termsId?: number) {
  const q = termsId ? `?terms_id=${termsId}` : "";
  return apiFetch(`/terms/agreement-status${q}`);
}
export function agreeTerms(termsId: number) {
  return apiFetch("/terms/agree", {
    method: "POST",
    body: JSON.stringify({ terms_id: termsId }),
  });
}
