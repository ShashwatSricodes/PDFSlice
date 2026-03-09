export function ProgressBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="w-full h-0.5 bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-foreground animate-progress rounded-full" />
    </div>
  );
}
