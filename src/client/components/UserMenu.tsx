import { useState } from "react";
import { LogOut, KeyRound, Copy, Check } from "lucide-react";
import { signOut, useSession, authClient } from "@/lib/auth-client.js";
import { Button } from "@/components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";

export default function UserMenu() {
  const { data: session } = useSession();
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const userEmail = session?.user?.email ?? "";
  const initial = (session?.user?.name?.[0] ?? userEmail[0] ?? "?").toUpperCase();

  async function handleGenerateKey() {
    setLoading(true);
    setError(null);
    setGeneratedKey(null);
    try {
      const { data, error: apiError } = await authClient.apiKey.create();
      if (apiError) {
        setError(apiError.message ?? "Failed to generate API key");
      } else {
        setGeneratedKey(data?.key ?? null);
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to generate API key");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDialogOpenClose(open: boolean) {
    setApiKeyDialogOpen(open);
    if (!open) {
      setGeneratedKey(null);
      setError(null);
      setCopied(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 rounded-full bg-muted text-sm font-medium"
          >
            {initial}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">
            {userEmail}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setApiKeyDialogOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Generate API key
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={apiKeyDialogOpen} onOpenChange={handleDialogOpenClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>
              Create a key to upload cards from the CLI. The key is only shown once.
            </DialogDescription>
          </DialogHeader>

          {!generatedKey ? (
            <div className="space-y-3">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={handleGenerateKey} disabled={loading} className="w-full">
                {loading ? "Generating..." : "Generate key"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">
                  {generatedKey}
                </code>
                <Button variant="ghost" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Copy this key now — you won't be able to see it again.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
