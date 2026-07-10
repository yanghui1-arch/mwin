export function success(data: unknown, message = 'Successfully'): Response {
  return json({ code: 200, message, data });
}
export function error(message: string): Response { return json({ code: 500, message, data: null }); }
export function notFound(message: string): Response { return json({ code: 404, message, data: null }); }
export function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
