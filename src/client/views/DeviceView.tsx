import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSession } from "@/lib/auth-client.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AuthView from "./AuthView.js";

export default function DeviceView() {
  const { data: session, isPending } = useSession();
  const [searchParams] = useSearchParams();
  const [userCode, setUserCode] = useState(searchParams.get("user_code") ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "approved" | "denied" | "error">("idle");
  const [error, setError] = useState("");

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthView />;
  }

  async function handleApprove() {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/auth/device/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userCode: userCode.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).message || `Failed (${res.status})`);
      }
      setStatus("approved");
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  }

  async function handleDeny() {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/auth/device/deny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userCode: userCode.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).message || `Failed (${res.status})`);
      }
      setStatus("denied");
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  }

  if (status === "approved") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Device approved</CardTitle>
            <CardDescription>You can close this tab and return to your terminal.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Login denied</CardTitle>
            <CardDescription>The CLI login request was denied.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold mb-6">Amber</h1>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Authorize CLI</CardTitle>
          <CardDescription>
            Enter the code shown in your terminal to authorize the CLI.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            placeholder="Enter device code"
            value={userCode}
            onChange={(e) => setUserCode(e.target.value)}
            autoFocus
            className="text-center text-lg tracking-widest font-mono"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={!userCode.trim() || status === "loading"}
              className="flex-1"
            >
              {status === "loading" ? "..." : "Approve"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDeny}
              disabled={!userCode.trim() || status === "loading"}
            >
              Deny
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
