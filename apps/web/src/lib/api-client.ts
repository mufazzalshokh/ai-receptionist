interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: { total: number; page: number; limit: number };
}

export async function fetchApi<T>(url: string): Promise<ApiResponse<T>> {
  const res = await fetch(url);

  if (res.status === 401) {
    window.location.href = "/login";
    return { success: false, data: null, error: "Unauthorized" };
  }

  if (!res.ok) {
    return { success: false, data: null, error: `Request failed (${res.status})` };
  }

  return res.json();
}
