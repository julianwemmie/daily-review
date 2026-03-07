import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { program } from "commander";

// We test main.ts indirectly by verifying the program structure.
// Import the actual program to test command registration and routing.

describe("CLI main program", () => {
  let prog: typeof program;

  beforeEach(async () => {
    // Re-import to get a fresh program — commander mutates global state,
    // so we build a minimal replica of the command structure.
    const { Command } = await import("commander");
    prog = new Command();
    prog
      .name("amber")
      .description("Amber CLI — spaced repetition flashcards")
      .version("0.7.0");

    // Add commands the same way main.ts does
    const { uploadCommand } = await import("../../src/cli/commands/upload.js");
    const { importCommand } = await import("../../src/cli/commands/import.js");
    const { exportCommand } = await import("../../src/cli/commands/export.js");
    const { listCommand } = await import("../../src/cli/commands/list.js");
    const { deleteCommand } = await import("../../src/cli/commands/delete.js");
    const { reviewCommand } = await import("../../src/cli/commands/review.js");
    const { loginCommand } = await import("../../src/cli/commands/login.js");
    const { statusCommand } = await import("../../src/cli/commands/status.js");

    prog.addCommand(uploadCommand);
    prog.addCommand(importCommand);
    prog.addCommand(exportCommand);
    prog.addCommand(listCommand);
    prog.addCommand(deleteCommand);
    prog.addCommand(reviewCommand);
    prog.addCommand(loginCommand);
    prog.addCommand(statusCommand);
  });

  it("registers all 8 commands", () => {
    const names = prog.commands.map((c) => c.name());
    expect(names).toEqual(
      expect.arrayContaining([
        "upload",
        "import",
        "export",
        "list",
        "delete",
        "review",
        "login",
        "status",
      ]),
    );
    expect(names).toHaveLength(8);
  });

  it("has program name and description", () => {
    expect(prog.name()).toBe("amber");
    expect(prog.description()).toContain("Amber");
  });

  describe("upload command", () => {
    it("accepts a file argument and options", () => {
      const cmd = prog.commands.find((c) => c.name() === "upload")!;
      expect(cmd.description()).toContain("flashcards");
      const optNames = cmd.options.map((o) => o.long);
      expect(optNames).toEqual(
        expect.arrayContaining(["--front", "--back", "--tags", "--api-key", "--server"]),
      );
    });
  });

  describe("list command", () => {
    it("has status, query, json, and auth options", () => {
      const cmd = prog.commands.find((c) => c.name() === "list")!;
      const optNames = cmd.options.map((o) => o.long);
      expect(optNames).toEqual(
        expect.arrayContaining(["--status", "--query", "--json", "--api-key", "--server"]),
      );
    });
  });

  describe("delete command", () => {
    it("requires ids argument", () => {
      const cmd = prog.commands.find((c) => c.name() === "delete")!;
      // Commander registers args — the first arg should be ids
      expect(cmd.registeredArguments.length).toBeGreaterThanOrEqual(1);
      expect(cmd.registeredArguments[0].name()).toBe("ids");
    });
  });

  describe("review command", () => {
    it("has count and no-grader options", () => {
      const cmd = prog.commands.find((c) => c.name() === "review")!;
      const optNames = cmd.options.map((o) => o.long);
      expect(optNames).toEqual(
        expect.arrayContaining(["--count", "--no-grader"]),
      );
    });
  });

  describe("export command", () => {
    it("has output and scheduling options", () => {
      const cmd = prog.commands.find((c) => c.name() === "export")!;
      const optNames = cmd.options.map((o) => o.long);
      expect(optNames).toEqual(
        expect.arrayContaining(["--output", "--include-scheduling", "--include-review-history"]),
      );
    });
  });

  describe("import command", () => {
    it("requires a file argument", () => {
      const cmd = prog.commands.find((c) => c.name() === "import")!;
      expect(cmd.registeredArguments.length).toBeGreaterThanOrEqual(1);
      expect(cmd.registeredArguments[0].name()).toBe("file");
      expect(cmd.registeredArguments[0].required).toBe(true);
    });
  });

  describe("login command", () => {
    it("has api-key and server options", () => {
      const cmd = prog.commands.find((c) => c.name() === "login")!;
      const optNames = cmd.options.map((o) => o.long);
      expect(optNames).toEqual(
        expect.arrayContaining(["--api-key", "--server"]),
      );
    });
  });

  describe("status command", () => {
    it("has json and auth options", () => {
      const cmd = prog.commands.find((c) => c.name() === "status")!;
      const optNames = cmd.options.map((o) => o.long);
      expect(optNames).toEqual(
        expect.arrayContaining(["--json", "--api-key", "--server"]),
      );
    });
  });

});
