import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.js";
import { Button } from "@/components/ui/button.js";

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  {
    title: "Welcome to Amber",
    content: (
      <p className="text-sm text-muted-foreground">
        Turn your Claude Code conversations into flashcards and retain what you learn through spaced repetition.
      </p>
    ),
  },
  {
    title: "The Core Loop",
    content: (
      <div className="flex items-center justify-center gap-3 text-sm py-2">
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pastel-lavender text-[oklch(0.45_0.10_300)] font-bold dark:bg-pastel-lavender dark:text-[oklch(0.80_0.08_300)]">1</div>
          <span className="font-medium text-foreground">Generate</span>
          <span className="text-xs text-muted-foreground text-center">
            Run <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">/flashcards</code>
          </span>
        </div>
        <span className="text-muted-foreground/50 text-lg mt-[-1rem]">&rarr;</span>
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pastel-lavender text-[oklch(0.45_0.10_300)] font-bold dark:bg-pastel-lavender dark:text-[oklch(0.80_0.08_300)]">2</div>
          <span className="font-medium text-foreground">Triage</span>
          <span className="text-xs text-muted-foreground text-center">Keep or discard cards</span>
        </div>
        <span className="text-muted-foreground/50 text-lg mt-[-1rem]">&rarr;</span>
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pastel-lavender text-[oklch(0.45_0.10_300)] font-bold dark:bg-pastel-lavender dark:text-[oklch(0.80_0.08_300)]">3</div>
          <span className="font-medium text-foreground">Review</span>
          <span className="text-xs text-muted-foreground text-center">Answer when due</span>
        </div>
      </div>
    ),
  },
  {
    title: "Setting Up Claude Code",
    content: (
      <div className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">1. Generate an API key</p>
          <p>
            Open the profile menu in the top-right corner and
            select "Generate API key". Copy the key -- it is only shown once.
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground">
            2. Connect Claude Code
          </p>
          <p>
            The <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">/flashcards</code> skill
            in Claude Code will use this key to upload cards to your account.
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground">
            3. Start generating cards
          </p>
          <p>
            After a coding session, run{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">/flashcards</code> to
            generate cards from your conversation.
          </p>
        </div>
      </div>
    ),
  },
] as const;

export default function OnboardingModal({ open, onOpenChange }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  // Reset to the first step whenever the modal opens
  useEffect(() => {
    if (open) {
      setStep(0);
    }
  }, [open]);

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{STEPS[step].title}</DialogTitle>
          <DialogDescription className="sr-only">
            Onboarding step {step + 1} of {STEPS.length}
          </DialogDescription>
        </DialogHeader>

        {STEPS[step].content}

        <DialogFooter className="sm:justify-between">
          {/* Step dot indicators */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === step ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep(step + 1)}>
                Next
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
