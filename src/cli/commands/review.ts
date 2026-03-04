import { Command } from "commander";
import * as p from "@clack/prompts";
import { ApiClient } from "../api.js";
import { getAuth, getServerUrl } from "../config.js";
import { Rating, type Card } from "../../shared/types.js";
import readline from "readline";

const RATING_OPTIONS = [
  { key: "1", value: Rating.Again, label: "Again", hint: "Forgot completely" },
  { key: "2", value: Rating.Hard, label: "Hard", hint: "Recalled with difficulty" },
  { key: "3", value: Rating.Good, label: "Good", hint: "Recalled correctly" },
  { key: "4", value: Rating.Easy, label: "Easy", hint: "Effortless recall" },
] as const;

// clack-style colors
const dim = (s: string) => `\x1b[2m${s}\x1b[22m`;
const green = (s: string) => `\x1b[32m${s}\x1b[39m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[39m`;
const inverse = (s: string) => `\x1b[7m${s}\x1b[27m`;
const BAR = dim("\u2502");
const BAR_END = dim("\u2514");

function promptRating(): Promise<Rating | null> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    readline.emitKeypressEvents(process.stdin, rl);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    let selected = 2; // default to "Good"
    const totalLines = RATING_OPTIONS.length + 2; // header + options + footer

    function render() {
      // Move cursor up to clear previous render (skip on first render)
      const lines = [
        `${cyan("\u25c6")}  Rate your recall:`,
        ...RATING_OPTIONS.map((o, i) => {
          const radio = i === selected ? green("\u25cf") : dim("\u25cb");
          const label = i === selected ? o.label : dim(o.label);
          const hint = i === selected ? ` ${dim(`— ${o.hint}`)}` : "";
          const num = dim(`${o.key})`);
          return `${BAR}  ${num} ${radio} ${label}${hint}`;
        }),
        `${BAR_END}`,
      ];
      // Clear previous output
      process.stdout.write(`\x1b[${totalLines}A\x1b[0J`);
      process.stdout.write(lines.join("\n") + "\n");
    }

    // Initial render (write blank lines first so the cursor-up works)
    process.stdout.write("\n".repeat(totalLines));
    render();

    function onKeypress(_: string, key: readline.Key) {
      if (!key) return;

      if (key.name === "c" && key.ctrl) {
        cleanup();
        // Show cancelled state in clack style
        process.stdout.write(`\x1b[${totalLines}A\x1b[0J`);
        process.stdout.write(`${dim("\u25a0")}  Rate your recall:\n`);
        process.stdout.write(`${BAR_END}\n`);
        resolve(null);
        return;
      }

      // Number keys 1-4
      const num = parseInt(key.sequence ?? "", 10);
      if (num >= 1 && num <= 4) {
        selected = num - 1;
        finish();
        return;
      }

      if (key.name === "up") {
        selected = Math.max(0, selected - 1);
        render();
      } else if (key.name === "down") {
        selected = Math.min(RATING_OPTIONS.length - 1, selected + 1);
        render();
      } else if (key.name === "return") {
        finish();
      }
    }

    function finish() {
      cleanup();
      const choice = RATING_OPTIONS[selected];
      // Show confirmed state in clack style
      process.stdout.write(`\x1b[${totalLines}A\x1b[0J`);
      process.stdout.write(`${green("\u25c7")}  Rate your recall: ${dim(choice.label)}\n`);
      process.stdout.write(`${BAR}\n`);
      resolve(choice.value);
    }

    function cleanup() {
      process.stdin.removeListener("keypress", onKeypress);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      rl.close();
    }

    process.stdin.on("keypress", onKeypress);
  });
}

function showCard(card: Card, index: number, total: number): void {
  const tags = card.tags?.length ? `  Tags: ${card.tags.join(", ")}` : "";
  console.log(`\n  [${index + 1}/${total}]${tags}`);
  console.log(`  Q: ${card.front}`);
}

export const reviewCommand = new Command("review")
  .description("Interactive review session for due cards")
  .option("-n, --count <n>", "Max cards to review")
  .option("--no-grader", "Skip LLM grading")
  .option("--api-key <key>", "API key")
  .option("--server <url>", "Server URL")
  .action(async (opts) => {
    const api = new ApiClient({
      auth: getAuth(opts.apiKey),
      serverUrl: getServerUrl(opts.server),
    });

    const spinner = p.spinner();
    spinner.start("Fetching due cards");

    const { cards } = await api.getDueCards();
    const reviewCards = opts.count ? cards.slice(0, Number(opts.count)) : cards;

    if (reviewCards.length === 0) {
      spinner.stop("No cards due for review!");
      return;
    }

    spinner.stop(`${reviewCards.length} card${reviewCards.length === 1 ? "" : "s"} due`);

    let reviewed = 0;

    for (let i = 0; i < reviewCards.length; i++) {
      const card = reviewCards[i];
      showCard(card, i, reviewCards.length);

      // Get user's answer
      const answer = await p.text({
        message: "Your answer:",
        placeholder: "Type your answer, then you'll rate yourself",
      });

      if (p.isCancel(answer)) break;

      // Show the back of the card
      if (card.back) {
        console.log(`  A: ${card.back}`);
      }

      // Try LLM grading if enabled
      let llmScore: number | undefined;
      let llmFeedback: string | undefined;

      if (opts.grader !== false && answer) {
        try {
          const evalResult = await api.evaluateCard(card.id, answer as string);
          llmScore = evalResult.score;
          llmFeedback = evalResult.feedback;
          const pct = Math.round(evalResult.score * 100);
          console.log(`  LLM: ${pct}% — ${evalResult.feedback}`);
        } catch {
          // Grader not available, skip silently
        }
      }

      // Self-rate (1-4 number keys or arrow keys + enter)
      const rating = await promptRating();

      if (!rating) break;

      await api.reviewCard(card.id, rating as Rating, {
        answer: answer as string,
        llm_score: llmScore,
        llm_feedback: llmFeedback,
      });

      reviewed++;
    }

    p.log.success(`Session complete: reviewed ${reviewed} card${reviewed === 1 ? "" : "s"}`);
  });
