export async function api(path, options = {}) {
  const init = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };
  const response = await fetch(path, init);
  if (!response.ok) {
    let detail = `请求失败 (${response.status})`;
    try {
      const body = await response.json();
      if (body.detail) {
        detail = typeof body.detail === "string" ? body.detail : detail;
      }
    } catch (_) {
      // keep fallback message
    }
    throw new Error(detail);
  }
  return response.json();
}
