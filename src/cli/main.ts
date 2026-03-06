#!/usr/bin/env node
import { program } from "commander";
import { uploadCommand } from "./commands/upload.js";
import { importCommand } from "./commands/import.js";
import { exportCommand } from "./commands/export.js";
import { listCommand } from "./commands/list.js";
import { deleteCommand } from "./commands/delete.js";
import { reviewCommand } from "./commands/review.js";
import { loginCommand } from "./commands/login.js";
import { statusCommand } from "./commands/status.js";

program
  .name("amber-cards")
  .description("Amber CLI — spaced repetition flashcards")
  .version("0.0.1");

program.addCommand(uploadCommand);
program.addCommand(importCommand);
program.addCommand(exportCommand);
program.addCommand(listCommand);
program.addCommand(deleteCommand);
program.addCommand(reviewCommand);
program.addCommand(loginCommand);
program.addCommand(statusCommand);

program.parse();
