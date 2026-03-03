import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AuthView() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp.email({ email, password, name });
        if (error) {
          setError(error.message ?? "Sign up failed");
          return;
        }
      } else {
        const { error } = await signIn.email({ email, password });
        if (error) {
          setError(error.message ?? "Sign in failed");
          return;
        }
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold mb-6">Daily Review</h1>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isSignUp ? "Create account" : "Sign in"}</CardTitle>
          <CardDescription>
            {isSignUp ? "Get started with Daily Review" : "Welcome back"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              setError("");
              const { error } = await signIn.social({ provider: "github" });
              if (error) setError(error.message ?? "GitHub sign-in failed");
            }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Loading..." : isSignUp ? "Sign up" : "Sign in"}
            </Button>
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="text-sm text-muted-foreground hover:underline"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
