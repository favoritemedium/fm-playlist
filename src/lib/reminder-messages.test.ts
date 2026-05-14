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
        "🌟 *Happy Monday!*",
        "",
        "Let's kick off the week with a fresh round of songs.",
        "",
        "* Share one track you've been loving",
        "* <https://playlist.example.com|Open FM Playlist>",
        "",
        "_Have a fantastic week ahead!_",
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
        "Thanks for keeping the playlist moving this week:",
        "* Ada",
        "* Grace",
        "",
        "<https://playlist.example.com|Listen to this week's FM Playlist>",
        "",
        "_Have a wonderful weekend!_",
      ].join("\n")
    );
  });

  it("builds the Friday no-submitters nudge", () => {
    expect(buildFridayNoSubmittersMessage("https://playlist.example.com")).toBe(
      [
        "🎧 *Happy Friday!*",
        "",
        "No new songs landed in the playlist this week.",
        "",
        "<https://playlist.example.com|Add a track to start next week's FM Playlist>",
        "",
        "_Have a wonderful weekend!_",
      ].join("\n")
    );
  });
});