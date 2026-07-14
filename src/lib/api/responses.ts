type ApiErrorPayload = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

type ApiSuccessPayload<T> = {
  ok: true;
  data: T;
};

export function apiOk<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data } satisfies ApiSuccessPayload<T>, init);
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return Response.json(
    {
      ok: false,
      error: {
        code,
        message,
        details,
      },
    } satisfies ApiErrorPayload,
    { status },
  );
}
