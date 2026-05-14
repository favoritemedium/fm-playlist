import { describe, expect, it, vi } from "vitest";
import { sendGoogleChatMessage } from "./google-chat";

describe("sendGoogleChatMessage", () => {
  it("posts a text message to the webhook URL", async () => {
    const fetchMock = vi.fn(async () => new Response('{"name":"spaces/test/messages/1"}', { status: 200 }));

    const result = await sendGoogleChatMessage(
      "https://chat.example.test/webhook",
      "Hello team",
      fetchMock as unknown as typeof fetch
    );

    expect(result).toEqual({
      status: 200,
      body: '{"name":"spaces/test/messages/1"}',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://chat.example.test/webhook");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json; charset=UTF-8" });
    expect(init.body).toBe(JSON.stringify({ text: "Hello team" }));
  });

  it("throws a GoogleChatError for non-2xx responses", async () => {
    const fetchMock = vi.fn(async () => new Response("bad webhook", { status: 403 }));

    await expect(
      sendGoogleChatMessage(
        "https://chat.example.test/webhook",
        "Hello team",
        fetchMock as unknown as typeof fetch
      )
    ).rejects.toMatchObject({
      name: "GoogleChatError",
      code: "GOOGLE_CHAT_SEND_FAILED",
      status: 403,
      responseBody: "bad webhook",
    });
  });
});