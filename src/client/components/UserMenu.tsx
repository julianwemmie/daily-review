import { useState, useEffect } from "react";
import { LogOut, LogIn, KeyRound, HelpCircle, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import { useStorage } from "@/lib/storage/context.js";
import { ROUTES } from "@/lib/routes.js";

export default function UserMenu() {
  const { data: session } = useSession();
  const storage = useStorage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);

  const isDemo = !session;
  const userEmail = session?.user?.email ?? "";
  const initial = isDemo ? "?" : (session?.user?.name?.[0] ?? userEmail[0] ?? "?").toUpperCase();

  useEffect(() => {
    if (!session?.user?.id) return;
    storage.getNotificationPreference()
      .then((enabled) => {
        setNotificationsEnabled(enabled);
        setNotificationsLoaded(true);
      })
      .catch(() => {
        // Silently fail — default to true
        setNotificationsLoaded(true);
      });
  }, [session?.user?.id, storage]);

  async function handleToggleNotifications() {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    try {
      await storage.setNotificationPreference(newValue);
    } catch {
      // Revert on failure
      setNotificationsEnabled(!newValue);
    }
  }

  if (isDemo) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(ROUTES.login)}
        className="gap-1.5"
      >
        <LogIn className="h-4 w-4" />
        Sign in
      </Button>
    );
  }

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
          {notificationsLoaded && (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleToggleNotifications(); }}>
              <Bell className="mr-2 h-4 w-4" />
              <span className="flex-1">Email Reminders</span>
              <span
                role="switch"
                aria-checked={notificationsEnabled}
                className={`relative ml-2 inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  notificationsEnabled ? "bg-olive" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                    notificationsEnabled ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => window.open("https://amber.cards/docs/getting-started", "_blank")}>
            <HelpCircle className="mr-2 h-4 w-4" />
            Help
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => {
            signOut();
            queryClient.clear();
          }}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ApiKeyManager open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen} />
    </>
  );
}
