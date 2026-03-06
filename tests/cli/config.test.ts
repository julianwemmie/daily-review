import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

// Mock fs before importing config
vi.mock("fs");

const CONFIG_DIR = path.join(os.homedir(), ".amber-cards");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

describe("config", () => {
  let loadConfig: typeof import("../../src/cli/config.js").loadConfig;
  let saveConfig: typeof import("../../src/cli/config.js").saveConfig;
  let getAuth: typeof import("../../src/cli/config.js").getAuth;
  let getServerUrl: typeof import("../../src/cli/config.js").getServerUrl;

  beforeEach(async () => {
    vi.resetModules();
    vi.mocked(fs.readFileSync).mockReset();
    vi.mocked(fs.writeFileSync).mockReset();
    vi.mocked(fs.mkdirSync).mockReset();
    delete process.env.AMBER_CARDS_API_KEY;
    delete process.env.AMBER_CARDS_URL;
    delete process.env.VITE_APP_URL;

    const mod = await import("../../src/cli/config.js");
    loadConfig = mod.loadConfig;
    saveConfig = mod.saveConfig;
    getAuth = mod.getAuth;
    getServerUrl = mod.getServerUrl;
  });

  describe("loadConfig", () => {
    it("returns defaults when config file missing", () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });
      const config = loadConfig();
      expect(config.serverUrl).toBe("http://localhost:3000");
      expect(config.apiKey).toBeUndefined();
    });

    it("merges saved config with defaults", () => {
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ apiKey: "saved-key", serverUrl: "https://amber.app" }),
      );
      const config = loadConfig();
      expect(config.apiKey).toBe("saved-key");
      expect(config.serverUrl).toBe("https://amber.app");
    });
  });

  describe("saveConfig", () => {
    it("creates config dir and writes merged config", () => {
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ serverUrl: "http://localhost:3000" }),
      );
      saveConfig({ apiKey: "new-key" });

      expect(fs.mkdirSync).toHaveBeenCalledWith(CONFIG_DIR, { recursive: true });
      const written = JSON.parse(
        vi.mocked(fs.writeFileSync).mock.calls[0][1] as string,
      );
      expect(written.apiKey).toBe("new-key");
      expect(written.serverUrl).toBe("http://localhost:3000");
    });
  });

  describe("getAuth", () => {
    it("prefers explicit option key", () => {
      const auth = getAuth("option-key");
      expect(auth).toEqual({ type: "api-key", token: "option-key" });
    });

    it("uses env var as second priority", () => {
      process.env.AMBER_CARDS_API_KEY = "env-key";
      const auth = getAuth();
      expect(auth).toEqual({ type: "api-key", token: "env-key" });
    });

    it("uses saved session token as third priority", () => {
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ sessionToken: "session-tok", serverUrl: "http://localhost:3000" }),
      );
      const auth = getAuth();
      expect(auth).toEqual({ type: "bearer", token: "session-tok" });
    });

    it("uses saved API key as fourth priority", () => {
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ apiKey: "config-key", serverUrl: "http://localhost:3000" }),
      );
      const auth = getAuth();
      expect(auth).toEqual({ type: "api-key", token: "config-key" });
    });

    it("exits when no auth is available", () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("exit");
      });
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => getAuth()).toThrow("exit");
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe("getServerUrl", () => {
    it("prefers explicit option", () => {
      expect(getServerUrl("https://custom.url")).toBe("https://custom.url");
    });

    it("uses env var as second priority", () => {
      process.env.AMBER_CARDS_URL = "https://env.url";
      expect(getServerUrl()).toBe("https://env.url");
    });

    it("falls back to config", () => {
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ serverUrl: "https://saved.url" }),
      );
      expect(getServerUrl()).toBe("https://saved.url");
    });
  });
});
