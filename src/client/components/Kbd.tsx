export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-1.5 inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
      {children}
    </kbd>
  );
}
