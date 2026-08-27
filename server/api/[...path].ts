import type { H3Event } from 'h3'

export default defineEventHandler(async (event: H3Event) => {

  const config = useRuntimeConfig();
  const path = getRouterParam(event, 'path');
  const method:any = event.method?.toUpperCase() || 'GET';
  const token = getCookie(event, 'auth_token');
  const query = getQuery(event);

  // Forward incoming headers
  const incomingHeaders = getHeaders(event)

  if (!path) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing API path'
    })
  }

  let body: any = undefined;

  // Forward ONLY a safe ALLOWLIST of client headers upstream. Spreading every
  // incoming header let a client spoof X-Forwarded-*, X-Real-IP, Host, Cookie,
  // Forwarded, etc. — which the backend could trust for client IP, rate-limiting
  // or URL/link generation. Anything not listed here is dropped. Auth rides on the
  // Bearer set from the HttpOnly cookie below (not the forwarded Cookie header).
  const FORWARD_ALLOWLIST = ['content-type', 'accept-language', 'x-requested-with', 'user-agent']
  const headers: Record<string, any> = { Accept: 'application/json' }
  for (const name of FORWARD_ALLOWLIST) {
    const v = (incomingHeaders as any)[name]
    if (v) headers[name] = v
  }

   // Authorization with auth cookie token if available
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

    // Read body for all non-GET requests
    if (!['GET', 'HEAD'].includes(method)) {

      const contentType = getHeader(event, 'content-type') || '';

        // File upload support
        if (contentType.includes('multipart/form-data')) {
          
          // Raw body as buffer
         body= await readRawBody(event,false);
         
          // Original Content-Type header preserve set (boundary)
          if (contentType) {
            headers['Content-Type'] = contentType
          }
          
        } else {
          // Normal JSON body
          body = await readBody(event);
        }
  }

  try {

    const response: any = await $fetch(
      `${config.public.apiBase}/${path}`,
      {
        method,
        query,
        body,
        headers
      }
    );
    return response;
  } catch (error: any) {

    const statusCode = error?.response?.status || error?.status || 500;
    const responseData = error?.response?._data || error?.data || {};

    // SET REAL STATUS
    setResponseStatus(event, statusCode);

    // AUTO LOGOUT — a 401, or the backend's session-timeout marker `expired: true`
    // (so an idle logout clears the cookie even if it ever arrives non-401). A plain
    // 404 without the flag is left untouched.
    if (statusCode === 401 || (responseData as any)?.expired === true) {
      deleteCookie(event, 'auth_token')
    }

    return responseData;
  }
})