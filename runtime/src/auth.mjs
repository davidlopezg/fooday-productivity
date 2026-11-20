export async function authenticate(request, config) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new HttpError(401, "Falta el token de autenticación");

  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: config.supabaseAnonKey,
      authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new HttpError(401, "Sesión inválida o caducada");

  const user = await response.json();
  if (!user?.id) throw new HttpError(401, "La sesión no tiene un usuario válido");
  return { id: user.id, token };
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function supabaseHeaders(token, config, extra = {}) {
  return {
    apikey: config.supabaseAnonKey,
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    ...extra,
  };
}

export async function supabaseFetch(path, options, token, config) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: supabaseHeaders(token, config, options.headers),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Supabase ${response.status}: ${detail}`);
  }
  return response;
}
