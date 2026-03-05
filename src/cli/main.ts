#!/usr/bin/env node
import { program } from "commander";
import { uploadCommand } from "./commands/upload.js";
import { importCommand } from "./commands/import.js";
import { listCommand } from "./commands/list.js";
import { deleteCommand } from "./commands/delete.js";
import { reviewCommand } from "./commands/review.js";
import { loginCommand } from "./commands/login.js";
import { statusCommand } from "./commands/status.js";

program
  .name("daily-review")
  .description("Daily Review CLI — spaced repetition flashcards")
  .version("0.0.1");

program.addCommand(uploadCommand);
program.addCommand(importCommand);
program.addCommand(listCommand);
program.addCommand(deleteCommand);
program.addCommand(reviewCommand);
program.addCommand(loginCommand);
program.addCommand(statusCommand);

program.parse();
