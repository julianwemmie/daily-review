import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes.js";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LoginPromptModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-terracotta" />
            Sign in for AI features
          </DialogTitle>
          <DialogDescription>
            AI-powered grading and analysis require a free account. Sign in to
            get personalized feedback on your answers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate(ROUTES.login);
            }}
          >
            Sign in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
