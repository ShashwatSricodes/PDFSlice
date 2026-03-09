export function LoadingSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-8 h-8 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
      <p className="text-sm font-mono text-muted-foreground">{label}</p>
    </div>
  );
}
