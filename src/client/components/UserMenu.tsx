import { useState } from "react";
import { LogOut, KeyRound, HelpCircle } from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client.js";
import { Button } from "@/components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";
import ApiKeyManager from "@/components/ApiKeyManager.js";

export default function UserMenu({ onHelpClick }: { onHelpClick?: () => void }) {
  const { data: session } = useSession();
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);

  const userEmail = session?.user?.email ?? "";
  const initial = (session?.user?.name?.[0] ?? userEmail[0] ?? "?").toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 rounded-full bg-muted text-sm font-medium hover:bg-muted/80 hover:ring-2 hover:ring-ring/20 transition-all"
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
            API Keys
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onHelpClick?.()}>
            <HelpCircle className="mr-2 h-4 w-4" />
            Help
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ApiKeyManager open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen} />
    </>
  );
}
