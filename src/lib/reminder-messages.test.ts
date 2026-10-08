import { describe, expect, it } from "vitest";
import {
  buildFridayNoSubmittersMessage,
  buildFridayThanksMessage,
  buildMondayReminderMessage,
  formatSubmitterNames,
} from "./reminder-messages";

describe("reminder messages", () => {
  it("formats submitter names naturally", () => {
    expect(formatSubmitterNames([{ name: "Ada", songCount: 1 }])).toBe("Ada");
    expect(
      formatSubmitterNames([
        { name: "Ada", songCount: 1 },
        { name: "Grace", songCount: 1 },
      ])
    ).toBe("Ada and Grace");
    expect(
      formatSubmitterNames([
        { name: "Ada", songCount: 1 },
        { name: "Grace", songCount: 1 },
        { name: "Linus", songCount: 1 },
      ])
    ).toBe("Ada, Grace, and Linus");
  });

  it("builds the Monday submission prompt with the agent hint", () => {
    expect(buildMondayReminderMessage("https://playlist.example.com/")).toBe(
      [
        "🎵 *Happy Monday!*",
        "",
        "Start the week with some music. Share one track you've been enjoying with the team.",
        "",
        "▶️ <https://playlist.example.com|Add your song>",
        "",
        "_You can also ask your AI agent to submit a song for you (one per week). <https://playlist.example.com/agent-api.md|Learn how>_",
      ].join("\n")
    );
  });

  it("builds the Friday thank-you message with submitter names", () => {
    expect(
      buildFridayThanksMessage(
        [
          { name: "Ada", songCount: 2 },
          { name: "Grace", songCount: 1 },
        ],
        "https://playlist.example.com"
      )
    ).toBe(
      [
        "🎉 *Happy Friday!*",
        "",
        "Thank you to everyone who shared a track this week:",
        "* Ada",
        "* Grace",
        "",
        "🎧 <https://playlist.example.com|Listen to this week's picks>",
        "",
        "_Have a great weekend!_",
      ].join("\n")
    );
  });

  it("builds the Friday no-submitters nudge", () => {
    expect(buildFridayNoSubmittersMessage("https://playlist.example.com")).toBe(
      [
        "🎧 *Happy Friday!*",
        "",
        "No new songs were added this week. There's still time to share one before the weekend.",
        "",
        "<https://playlist.example.com|Add a track>",
        "",
        "_Have a great weekend!_",
      ].join("\n")
    );
  });

  it("mentions AI agents only in the Monday message", () => {
    const base = "https://playlist.example.com";
    expect(buildMondayReminderMessage(base)).toContain("AI agent");
    expect(buildFridayThanksMessage([{ name: "Ada", songCount: 1 }], base)).not.toMatch(/agent/i);
    expect(buildFridayNoSubmittersMessage(base)).not.toMatch(/agent/i);
  });
});
