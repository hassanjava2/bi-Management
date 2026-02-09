export const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3001";

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function onAuthFailure(): void {
  try {
    localStorage.removeItem("token");
    if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  } catch {}
}

export async function fetchList<T>(
  endpoint: string,
  page = 1,
  limit = 20
): Promise<{ data: T[]; page: number; limit: number }> {
  const url = `${API_BASE}${endpoint}?page=${page}&limit=${limit}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (res.status === 401) {
    onAuthFailure();
    throw new Error("انتهت الجلسة");
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
