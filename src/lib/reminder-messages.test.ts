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

  it("builds the Monday submission prompt", () => {
    expect(buildMondayReminderMessage("https://playlist.example.com/")).toBe(
      [
        "Good morning! New week, new picks.",
        "Share one song you have been replaying on FM Playlist:",
        "https://playlist.example.com",
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
        "Thanks for keeping the playlist moving this week: Ada and Grace.",
        "Listen to the latest picks here:",
        "https://playlist.example.com",
      ].join("\n")
    );
  });

  it("builds the Friday no-submitters nudge", () => {
    expect(buildFridayNoSubmittersMessage("https://playlist.example.com")).toBe(
      [
        "No new songs landed in the playlist this week.",
        "Start the next round with a track you want the team to hear:",
        "https://playlist.example.com",
      ].join("\n")
    );
  });
});