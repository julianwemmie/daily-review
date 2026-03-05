import { useCallback, useRef, useState } from "react";
import { Download, AlertTriangle, FileUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseAnkiFile } from "../../shared/parsers/anki-parser.js";
import { parseMochiFile } from "../../shared/parsers/mochi-parser.js";
import { parseJsonFile } from "../../shared/parsers/json-parser.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { mapImportedCards, IMPORT_BATCH_SIZE, MAX_IMPORT_FILE_SIZE } from "../../shared/parsers/card-mapper.js";
import type { ParseResult, ImportedCard } from "../../shared/parsers/types.js";
import type { CardCreatePayload } from "../../shared/parsers/card-mapper.js";
import { useBatchCreateCards } from "@/hooks/useCards.js";

type ImportStep = "select" | "preview" | "importing" | "done";

const SOFT_LIMIT = 500;

export default function ImportModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<ImportStep>("select");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const preserveScheduling = false; // not yet supported by the API
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importedCount, setImportedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchCreate = useBatchCreateCards();

  function reset() {
    setStep("select");
    setParseResult(null);
    setParseError(null);
    setFileName("");
    setImporting(false);
    setImportProgress({ done: 0, total: 0 });
    setImportedCount(0);
  }

  function handleOpenChange(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  const handleFile = useCallback(async (file: File) => {
    setParseError(null);
    setFileName(file.name);

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "apkg" && ext !== "mochi" && ext !== "json") {
      setParseError("Unsupported file format. Please use .apkg (Anki), .mochi, or .json (Daily Review export) files.");
      return;
    }

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      setParseError(
        `File is too large (${(file.size / 1024 / 1024).toFixed(0)} MB). Maximum supported size is ${MAX_IMPORT_FILE_SIZE / 1024 / 1024} MB.`,
      );
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const result = ext === "json"
        ? parseJsonFile(buffer)
        : ext === "apkg"
          ? await parseAnkiFile(buffer, { sqlJsWasmUrl: sqlWasmUrl })
          : await parseMochiFile(buffer);

      if (result.cards.length === 0) {
        setParseError("No cards found in this file.");
        return;
      }

      setParseResult(result);
      setStep("preview");
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Failed to parse file. The file may be corrupted.",
      );
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [handleFile],
  );

  async function handleImport() {
    if (!parseResult) return;

    const cards: CardCreatePayload[] = mapImportedCards(parseResult.cards, {
      preserveScheduling,
    });

    setImporting(true);
    setStep("importing");
    setImportProgress({ done: 0, total: cards.length });

    let totalImported = 0;

    try {
      // Upload in batches
      for (let i = 0; i < cards.length; i += IMPORT_BATCH_SIZE) {
        const batch = cards.slice(i, i + IMPORT_BATCH_SIZE);
        const result = await batchCreate.mutateAsync(batch);
        totalImported += result.created;
        setImportProgress({ done: Math.min(i + IMPORT_BATCH_SIZE, cards.length), total: cards.length });
      }

      setImportedCount(totalImported);
      setStep("done");
    } catch (err) {
      console.error("Import error:", err);
      setParseError(
        err instanceof Error ? err.message : "Failed to import cards. Please try again.",
      );
      setStep("preview");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "done" ? "Import Complete" : "Import Cards"}
          </DialogTitle>
          {step === "select" && (
            <DialogDescription>
              Import flashcards from Anki (.apkg), Mochi (.mochi), or Daily Review (.json) files.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* ── Step: File selection ── */}
        {step === "select" && (
          <div className="flex flex-col gap-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-8 cursor-pointer transition-colors hover:border-foreground/30 hover:bg-muted/30"
            >
              <FileUp className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop a file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .apkg (Anki), .mochi, and .json (Daily Review) files
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".apkg,.mochi,.json"
              onChange={handleFileInput}
              className="hidden"
            />
            {parseError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {parseError}
              </div>
            )}
          </div>
        )}

        {/* ── Step: Preview ── */}
        {step === "preview" && parseResult && (
          <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
            {/* File info */}
            <div className="flex items-center gap-2">
              <Badge variant="outline">{parseResult.format === "anki" ? "Anki" : parseResult.format === "mochi" ? "Mochi" : "Daily Review"}</Badge>
              <span className="text-sm text-muted-foreground truncate">{fileName}</span>
              <button
                type="button"
                className="ml-auto text-xs text-muted-foreground underline hover:text-foreground"
                onClick={reset}
              >
                Choose different file
              </button>
            </div>

            {/* Warnings */}
            {parseResult.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400"
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {w}
              </div>
            ))}

            {/* Soft limit warning */}
            {parseResult.cards.length >= SOFT_LIMIT && (
              <div className="flex items-start gap-2 rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                This file contains {parseResult.cards.length.toLocaleString()} cards. Large imports
                may take a moment. You can proceed anyway.
              </div>
            )}

            {/* Card count */}
            <p className="text-sm font-medium">
              {parseResult.cards.length.toLocaleString()} card{parseResult.cards.length !== 1 ? "s" : ""} found
            </p>

            {/* Preview table */}
            <div className="overflow-auto rounded border max-h-64">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Front</th>
                    <th className="text-left px-3 py-2 font-medium">Back</th>
                    <th className="text-left px-3 py-2 font-medium">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.cards.slice(0, 50).map((card, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 max-w-[200px] truncate">{card.front}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate text-muted-foreground">
                        {card.back || "--"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {card.tags.slice(0, 3).map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px]">
                              {t}
                            </Badge>
                          ))}
                          {card.tags.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{card.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parseResult.cards.length > 50 && (
                <p className="px-3 py-2 text-xs text-muted-foreground border-t">
                  Showing first 50 of {parseResult.cards.length.toLocaleString()} cards
                </p>
              )}
            </div>

            {/* Scheduling toggle — not yet supported by the API */}
            <label className="flex items-center gap-2 cursor-pointer opacity-50 pointer-events-none">
              <input
                type="checkbox"
                checked={false}
                readOnly
                className="rounded border-border"
              />
              <span className="text-sm">Preserve scheduling data</span>
              <span className="text-xs text-muted-foreground">
                (coming soon)
              </span>
            </label>

            {parseError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {parseError}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                <Download className="h-4 w-4" />
                Import {parseResult.cards.length.toLocaleString()} card{parseResult.cards.length !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Step: Importing ── */}
        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">
              Importing cards... {importProgress.done.toLocaleString()} / {importProgress.total.toLocaleString()}
            </p>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="font-medium">
                Successfully imported {importedCount.toLocaleString()} card{importedCount !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                All cards have been added to your triage queue.
              </p>
            </div>
            <DialogFooter className="w-full">
              <Button onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
