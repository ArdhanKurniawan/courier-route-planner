export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
export function assertSameOrigin(request: Request, origin: string) {
  if (
    request.headers.get("origin") !== origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new HttpError(403, "FORBIDDEN", "Request origin denied.");
  }
}
export async function readJson(
  request: Request,
  maximum: number,
): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "JSON required.");
  }
  const declared = request.headers.get("content-length");
  if (
    declared !== null &&
    (!/^\d+$/u.test(declared) || Number(declared) > maximum)
  ) {
    throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Request body too large.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "INVALID_INPUT", "Invalid JSON.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      length += item.value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new HttpError(
          413,
          "PAYLOAD_TOO_LARGE",
          "Request body too large.",
        );
      }
      chunks.push(item.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    ) as unknown;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "INVALID_INPUT", "Invalid JSON.");
  } finally {
    reader.releaseLock();
  }
}
export function privateJson(
  value: unknown,
  status = 200,
  headers?: HeadersInit,
) {
  const output = new Headers(headers);
  output.set("Cache-Control", "private, no-store");
  return Response.json(value, { status, headers: output });
}
export function errorResponse(error: unknown) {
  const known =
    error instanceof HttpError
      ? error
      : new HttpError(503, "SERVICE_UNAVAILABLE", "Service unavailable.");
  return privateJson(
    {
      error: {
        code: known.code,
        message: known.message,
        ...(known.fieldErrors ? { fieldErrors: known.fieldErrors } : {}),
      },
    },
    known.status,
  );
}
