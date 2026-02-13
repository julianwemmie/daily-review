import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { createCard } from "@/lib/api.js";
import { useCounts } from "@/contexts/CountsContext.js";

export default function UploadView() {
  const [front, setFront] = useState("");
  const [context, setContext] = useState("");
  const [tags, setTags] = useState("");
  const { refreshCounts } = useCounts();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!front.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await createCard({
        front: front.trim(),
        context: context.trim() || undefined,
        tags: tagList.length > 0 ? tagList : undefined,
      });

      setFront("");
      setContext("");
      setTags("");
      setSuccess(true);
      refreshCounts();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create card");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <Card className="w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-lg">Create Card</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="front" className="text-sm font-medium">
                Front (question/prompt) *
              </label>
              <Textarea
                id="front"
                placeholder="What is the question or prompt?"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="context" className="text-sm font-medium">
                Context (optional)
              </label>
              <Textarea
                id="context"
                placeholder="Reference material for the LLM grader (not shown during review)"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="tags" className="text-sm font-medium">
                Tags (optional)
              </label>
              <Input
                id="tags"
                placeholder="Comma-separated, e.g. react, hooks, state"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && (
              <p className="text-sm text-green-600">Card created successfully.</p>
            )}
          </CardContent>
          <CardFooter className="pt-4">
            <Button type="submit" disabled={loading || !front.trim()}>
              {loading ? "Creating..." : "Create Card"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
