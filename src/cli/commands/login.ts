import { Command } from "commander";
import * as p from "@clack/prompts";
import { saveConfig, loadConfig, getServerUrl } from "../config.js";

const CLIENT_ID = "amber-cards-cli";
const POLL_INTERVAL_MS = 5000;
const TIMEOUT_MS = 5 * 60 * 1000;

async function deviceFlow(serverUrl: string): Promise<void> {
  const spinner = p.spinner();
  spinner.start("Requesting device code");

  const res = await fetch(`${serverUrl}/auth/device/code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID }),
  });

  if (!res.ok) {
    spinner.stop("Failed to request device code");
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).message || `HTTP ${res.status}`);
  }

  const { device_code, user_code, verification_uri } = await res.json() as {
    device_code: string;
    user_code: string;
    verification_uri: string;
  };

  spinner.stop("Device code received");

  const base = verification_uri.startsWith("http") ? verification_uri : `${serverUrl}${verification_uri}`;
  const fullUrl = `${base}?user_code=${user_code}`;

  p.log.step(`Open this URL and enter the code:\n\n  ${fullUrl}\n\n  Code: ${user_code}\n`);

  // Try to open browser automatically
  try {
    const { exec } = await import("child_process");
    const cmd = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
    exec(`${cmd} "${fullUrl}"`);
  } catch {
    // User will open manually
  }

  const pollSpinner = p.spinner();
  pollSpinner.start("Waiting for approval in browser...");

  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const tokenRes = await fetch(`${serverUrl}/auth/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code,
        client_id: CLIENT_ID,
      }),
    });

    const data = await tokenRes.json() as any;

    if (data.access_token && typeof data.access_token === "string") {
      saveConfig({ sessionToken: data.access_token, serverUrl });
      pollSpinner.stop("Logged in!");
      p.log.success("Session saved to ~/.amber-cards/config.json");
      return;
    }

    if (data.error === "expired_token") {
      pollSpinner.stop("Code expired");
      throw new Error("Device code expired. Please try again.");
    }

    if (data.error === "access_denied") {
      pollSpinner.stop("Denied");
      throw new Error("Login was denied.");
    }

    // "authorization_pending" — keep polling
  }

  pollSpinner.stop("Timed out");
  throw new Error("Login timed out. Please try again.");
}

async function apiKeyFlow(serverUrl: string): Promise<void> {
  const existing = loadConfig();

  const key = await p.text({
    message: "API key (from the web app):",
    placeholder: existing.apiKey ? "Leave blank to keep current" : "Enter your API key",
  });

  if (p.isCancel(key)) return process.exit(0);
  if (!key && !existing.apiKey) {
    p.log.error("No API key provided.");
    return;
  }

  const config: Record<string, string> = { serverUrl };
  if (key) config.apiKey = key as string;

  saveConfig(config);
  p.log.success("API key saved to ~/.amber-cards/config.json");
}

export const loginCommand = new Command("login")
  .description("Authenticate with Amber (browser OAuth by default)")
  .option("--api-key", "Use API key instead of browser login")
  .option("--server <url>", "Server URL")
  .action(async (opts) => {
    const serverUrl = getServerUrl(opts.server).replace(/\/$/, "");

    if (opts.apiKey) {
      await apiKeyFlow(serverUrl);
    } else {
      await deviceFlow(serverUrl);
    }
  });
