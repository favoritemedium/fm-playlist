export interface GoogleChatResponseSummary {
  status: number;
  body: string;
}

export class GoogleChatError extends Error {
  readonly code = "GOOGLE_CHAT_SEND_FAILED";
  readonly status: number;
  readonly responseBody: string;

  constructor(status: number, responseBody: string) {
    super(`Google Chat webhook returned ${status}`);
    this.name = "GoogleChatError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export async function sendGoogleChatMessage(
  webhookUrl: string,
  text: string,
  fetchImpl: typeof fetch = fetch
): Promise<GoogleChatResponseSummary> {
  const response = await fetchImpl(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ text }),
  });

  const body = await response.text().catch(() => "");

  if (!response.ok) {
    throw new GoogleChatError(response.status, body);
  }

  return { status: response.status, body };
}