/**
 * Showcase: Live Clock
 *
 * A real-time terminal clock demonstrating:
 * - Interval-based reactivity with setInterval
 * - Derived values for computed state
 * - Large ASCII art time display
 * - Pause/resume functionality
 * - Clean interval cleanup on unmount
 *
 * Controls:
 *   q - Quit
 *   p - Pause/Resume
 *   t - Cycle themes
 */

import { signal, derived } from "@rlabs-inc/signals";
import {
  mount,
  box,
  text,
  keyboard,
  t,
  setTheme,
  themes,
  BorderStyle,
  Attr
} from "../../index";

// =============================================================================
// ASCII ART DIGITS - Large 3-line height numbers
// =============================================================================

const DIGITS: Record<string, string[]> = {
  "0": ["╔═╗", "║ ║", "╚═╝"],
  "1": [" ╦ ", " ║ ", "═╩═"],
  "2": ["╔═╗", "╔═╝", "╚══"],
  "3": ["══╗", " ═╣", "══╝"],
  "4": ["╦ ╦", "╚═╣", "  ╩"],
  "5": ["╔══", "╚═╗", "══╝"],
  "6": ["╔══", "╠═╗", "╚═╝"],
  "7": ["══╗", "  ║", "  ╩"],
  "8": ["╔═╗", "╠═╣", "╚═╝"],
  "9": ["╔═╗", "╚═╣", "══╝"],
  ":": [" ", "●", " "],
  " ": ["   ", "   ", "   "]
};

/** Render a string of digits/colons as 3 lines of ASCII art */
function renderBigText(str: string): string[] {
  const lines = ["", "", ""];
  for (const char of str) {
    const digit = DIGITS[char] ?? DIGITS[" "];
    lines[0] += digit[0] + " ";
    lines[1] += digit[1] + " ";
    lines[2] += digit[2] + " ";
  }
  return lines;
}

// =============================================================================
// TIME FORMATTING
// =============================================================================

function formatTime(date: Date): string {
  const h = date
    .getHours()
    .toString()
    .padStart(2, "0");
  const m = date
    .getMinutes()
    .toString()
    .padStart(2, "0");
  const s = date
    .getSeconds()
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatDate(date: Date): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();
  const year = date.getFullYear();
  return `${dayName}, ${monthName} ${dayNum}, ${year}`;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main() {
  // State
  const startTime = Date.now();
  const now = signal(new Date());
  const paused = signal(false);
  const themeIndex = signal(0);
  const themeNames = Object.keys(themes) as (keyof typeof themes)[];

  // Derived values
  const timeStr = derived(() => formatTime(now.value));
  const dateStr = derived(() => formatDate(now.value));
  const elapsedMs = derived(() => now.value.getTime() - startTime);
  const elapsedStr = derived(() => formatElapsed(elapsedMs.value));
  const statusText = derived(() => (paused.value ? "PAUSED" : "RUNNING"));
  const currentThemeName = derived(() => themeNames[themeIndex.value]);

  // Big time display - derived lines
  const bigTimeLine0 = derived(() => renderBigText(timeStr.value)[0]);
  const bigTimeLine1 = derived(() => renderBigText(timeStr.value)[1]);
  const bigTimeLine2 = derived(() => renderBigText(timeStr.value)[2]);

  // Update interval
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function startClock() {
    if (intervalId) return;
    intervalId = setInterval(() => {
      if (!paused.value) {
        now.value = new Date();
      }
    }, 1000);
  }

  function stopClock() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  // Start the clock
  startClock();

  // Mount the UI
  const cleanup = await mount(
    () => {
      // Main container - centered on screen
      box({
        width: 56,
        padding: 1,
        border: BorderStyle.DOUBLE,
        borderColor: t.primary,
        justifyContent: "center",
        alignItems: "center",
        children: () => {
          // Header
          box({
            width: "100%",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 1,
            children: () => {
              text({
                content: "TERMINAL CLOCK",
                fg: t.primary,
                attrs: Attr.BOLD
              });
              text({
                content: statusText,
                fg: derived(() =>
                  paused.value ? t.warning.value : t.success.value
                )
              });
            }
          });

          // Divider
          text({ content: "═".repeat(52), fg: t.textMuted });

          // Big time display
          box({
            marginTop: 1,
            marginBottom: 1,
            alignItems: "center",
            children: () => {
              text({ content: bigTimeLine0, fg: t.accent, attrs: Attr.BOLD });
              text({ content: bigTimeLine1, fg: t.accent, attrs: Attr.BOLD });
              text({ content: bigTimeLine2, fg: t.accent, attrs: Attr.BOLD });
            }
          });

          // Date display
          box({
            width: "100%",
            alignItems: "center",
            marginBottom: 1,
            children: () => {
              text({ content: dateStr, fg: t.text });
            }
          });

          // Divider
          text({ content: "─".repeat(52), fg: t.textMuted });

          // Stats row
          box({
            width: "100%",
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 1,
            children: () => {
              // Elapsed time
              box({
                flexDirection: "row",
                gap: 1,
                children: () => {
                  text({ content: "Elapsed:", fg: t.textMuted });
                  text({ content: elapsedStr, fg: t.info });
                }
              });

              // Theme indicator
              box({
                flexDirection: "row",
                gap: 1,
                children: () => {
                  text({ content: "Theme:", fg: t.textMuted });
                  text({ content: currentThemeName, fg: t.secondary });
                }
              });
            }
          });

          // Divider
          text({ content: "─".repeat(52), fg: t.textMuted, marginTop: 1 });

          // Controls help
          box({
            width: "100%",
            flexDirection: "row",
            justifyContent: "center",
            gap: 3,
            marginTop: 1,
            children: () => {
              box({
                flexDirection: "row",
                gap: 1,
                children: () => {
                  text({ content: "[Q]", fg: t.error });
                  text({ content: "Quit", fg: t.textMuted });
                }
              });
              box({
                flexDirection: "row",
                gap: 1,
                children: () => {
                  text({ content: "[P]", fg: t.warning });
                  text({ content: "Pause", fg: t.textMuted });
                }
              });
              box({
                flexDirection: "row",
                gap: 1,
                children: () => {
                  text({ content: "[T]", fg: t.info });
                  text({ content: "Theme", fg: t.textMuted });
                }
              });
            }
          });
        }
      });
    },
    { mode: "inline", mouse: false }
  );

  // Keyboard handlers
  keyboard.onKey(["q", "Q"], () => {
    stopClock();
    cleanup();
  });

  keyboard.onKey(["p", "P"], () => {
    paused.value = !paused.value;
  });

  keyboard.onKey(["t", "T"], () => {
    themeIndex.value = (themeIndex.value + 1) % themeNames.length;
    setTheme(themeNames[themeIndex.value] as keyof typeof themes);
  });
}

main().catch(console.error);
