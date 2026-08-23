/** Builds a successful Java-backend-compatible API envelope. */
export function success(data: unknown, message = 'Successfully'): Response {
  return json({ code: 200, message, data });
}
/** Builds an error API envelope without exposing a stack trace. */
export function error(message: string, status = 500): Response {
  return json({ code: status, message, data: null }, status);
}
/** Builds a not-found API envelope. */
export function notFound(message: string): Response {
  return json({ code: 404, message, data: null }, 404);
}
/** Serializes an API envelope as a UTF-8 JSON response. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
