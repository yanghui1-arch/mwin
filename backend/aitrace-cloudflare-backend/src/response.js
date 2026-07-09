export function success(data, message = 'Response successfully') {
  return json({ code: 200, message, data }, 200);
}

export function error(message, status = 400) {
  return json({ code: status, message, data: null }, status);
}

export function notFound(message) {
  return json({ code: 404, message, data: null }, 404);
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}
