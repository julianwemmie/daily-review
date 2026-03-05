import { Command } from "commander";
import * as p from "@clack/prompts";
import fs from "fs";
import path from "path";
import { ApiClient } from "../api.js";
import { getAuth, getServerUrl } from "../config.js";
import { parseAnkiFile } from "../../shared/parsers/anki-parser.js";
import { parseMochiFile } from "../../shared/parsers/mochi-parser.js";
import { mapImportedCards, IMPORT_BATCH_SIZE, MAX_IMPORT_FILE_SIZE } from "../../shared/parsers/card-mapper.js";

export const importCommand = new Command("import")
  .description("Import flashcards from Anki (.apkg) or Mochi (.mochi) files")
  .argument("<file>", "Path to .apkg or .mochi file")
  .option("--preserve-scheduling", "Attempt to map source scheduling data to FSRS parameters")
  .option("--tags <tags>", "Extra comma-separated tags to add to all imported cards")
  .option("--api-key <key>", "API key")
  .option("--server <url>", "Server URL")
  .action(async (file, opts) => {
    const api = new ApiClient({
      auth: getAuth(opts.apiKey),
      serverUrl: getServerUrl(opts.server),
    });

    // Validate file exists
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) {
      p.log.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    // Detect format from extension
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== ".apkg" && ext !== ".mochi") {
      p.log.error("Unsupported file format. Please use .apkg (Anki) or .mochi files.");
      process.exit(1);
    }

    // Check file size
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_IMPORT_FILE_SIZE) {
      p.log.error(`File is too large (${(stat.size / 1024 / 1024).toFixed(0)} MB). Maximum supported size is ${MAX_IMPORT_FILE_SIZE / 1024 / 1024} MB.`);
      process.exit(1);
    }

    const spinner = p.spinner();
    spinner.start("Parsing file...");

    try {
      const buffer = fs.readFileSync(filePath);
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );

      const result = ext === ".apkg"
        ? await parseAnkiFile(arrayBuffer)
        : await parseMochiFile(arrayBuffer);

      spinner.stop(`Parsed ${result.cards.length} card${result.cards.length !== 1 ? "s" : ""} from ${result.format === "anki" ? "Anki" : "Mochi"} file`);

      // Show warnings
      for (const warning of result.warnings) {
        p.log.warn(warning);
      }

      if (result.cards.length === 0) {
        p.log.info("No cards found in this file.");
        return;
      }

      // Map cards to API shape
      const extraTags = opts.tags
        ? opts.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : undefined;

      const cards = mapImportedCards(result.cards, {
        extraTags,
        preserveScheduling: opts.preserveScheduling,
      });

      // Upload in batches
      const uploadSpinner = p.spinner();
      uploadSpinner.start(`Uploading ${cards.length} card${cards.length !== 1 ? "s" : ""}...`);

      let totalImported = 0;

      for (let i = 0; i < cards.length; i += IMPORT_BATCH_SIZE) {
        const batch = cards.slice(i, i + IMPORT_BATCH_SIZE);
        const batchResult = await api.batchCreateCards(batch);
        totalImported += batchResult.created;

        if (cards.length > IMPORT_BATCH_SIZE) {
          uploadSpinner.message(
            `Uploading... ${Math.min(i + IMPORT_BATCH_SIZE, cards.length)}/${cards.length}`,
          );
        }
      }

      uploadSpinner.stop(`Imported ${totalImported} card${totalImported !== 1 ? "s" : ""}`);
    } catch (err: any) {
      spinner.stop("Failed");
      p.log.error(err.message);
      process.exit(1);
    }
  });
