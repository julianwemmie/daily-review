import { useState, useEffect } from "react";
import { Copy, Check, Trash2, Plus, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.js";

interface ApiKey {
  id: string;
  name: string | null;
  createdAt: Date;
}

export default function ApiKeyManager({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create key state
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke confirmation state
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (open) {
      fetchKeys();
    } else {
      // Reset state when dialog closes
      setShowCreate(false);
      setNewKeyName("");
      setGeneratedKey(null);
      setCopied(false);
      setRevokeTarget(null);
      setError(null);
    }
  }, [open]);

  async function fetchKeys() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: apiError } = await authClient.apiKey.list();
      if (apiError) {
        setError(apiError.message ?? "Failed to load API keys");
      } else {
        setKeys(data ?? []);
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    const name = newKeyName.trim() || `Key ${Math.random().toString(36).slice(2, 8)}`;
    try {
      const { data, error: apiError } = await authClient.apiKey.create({
        name,
      });
      if (apiError) {
        setError(apiError.message ?? "Failed to create API key");
      } else {
        setGeneratedKey(data?.key ?? null);
        await fetchKeys();
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    setError(null);
    try {
      const { error: apiError } = await authClient.apiKey.delete({
        keyId: revokeTarget.id,
      });
      if (apiError) {
        setError(apiError.message ?? "Failed to revoke API key");
      } else {
        setRevokeTarget(null);
        await fetchKeys();
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to revoke API key");
    } finally {
      setRevoking(false);
    }
  }

  async function handleCopy() {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function resetCreate() {
    setShowCreate(false);
    setNewKeyName("");
    setGeneratedKey(null);
    setCopied(false);
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {revokeTarget ? (
          <>
            <DialogHeader>
              <DialogTitle>Revoke API key</DialogTitle>
              <DialogDescription>
                Are you sure you want to revoke{" "}
                <span className="font-medium text-foreground">
                  {revokeTarget.name ?? "this key"}
                </span>
                ? Any applications using this key will lose access.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRevokeTarget(null)}
                disabled={revoking}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRevoke}
                disabled={revoking}
              >
                {revoking ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Revoking...
                  </>
                ) : (
                  "Revoke key"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : generatedKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Key created</DialogTitle>
              <DialogDescription>
                Copy this key now — you won't be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">
                {generatedKey}
              </code>
              <Button variant="ghost" size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetCreate}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API Keys</DialogTitle>
              <DialogDescription>
                Manage keys for uploading cards from the CLI.
              </DialogDescription>
            </DialogHeader>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Key list */}
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </div>
              ) : keys.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No API keys yet.
                </p>
              ) : (
                keys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {key.name ?? "Unnamed key"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDate(key.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setRevokeTarget(key)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Create key form */}
            {showCreate ? (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="key-name">
                  Key name
                </label>
                <Input
                  id="key-name"
                  placeholder="e.g. Claude Code, CI Pipeline"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newKeyName.trim()) handleCreate();
                  }}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCreate(false);
                      setNewKeyName("");
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create key"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="mr-1" />
                Create new key
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
