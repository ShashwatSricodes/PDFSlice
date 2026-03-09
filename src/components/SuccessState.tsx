import { Download, Check } from "lucide-react";

interface SuccessStateProps {
  originalSize?: number;
  resultSize?: number;
  onDownload: () => void;
  filename: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function SuccessState({ originalSize, resultSize, onDownload, filename }: SuccessStateProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-8 text-center card-shadow animate-fade-in-up">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-offline-badge mb-4">
        <Check className="text-success" size={24} strokeWidth={2} />
      </div>
      <h3 className="font-heading text-2xl text-card-foreground mb-2">Done!</h3>
      <p className="text-sm font-mono text-muted-foreground mb-6">{filename}</p>

      {originalSize != null && resultSize != null && (
        <div className="flex justify-center gap-8 mb-6 text-sm font-mono">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Before</span>
            <span className="text-card-foreground">{formatSize(originalSize)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">After</span>
            <span className="text-card-foreground">{formatSize(resultSize)}</span>
          </div>
        </div>
      )}

      <button
        onClick={onDownload}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-mono text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Download size={16} strokeWidth={1.5} />
        Download
      </button>
    </div>
  );
}
