import { Upload } from "lucide-react";
import { useCallback, useState, useRef } from "react";

const MAX_SIZE_MB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface DropZoneProps {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
}

export function DropZone({ accept, multiple = false, onFiles, label }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndEmit = useCallback((files: File[]) => {
    const oversized = files.filter(f => f.size > MAX_SIZE_BYTES);
    if (oversized.length > 0) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      return;
    }

    if (accept === '.pdf') {
      const wrongType = files.filter(f => f.type !== 'application/pdf');
      if (wrongType.length > 0) {
        setError('Please upload a valid PDF file.');
        return;
      }
    }

    setError('');
    onFiles(files);
  }, [accept, onFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) validateAndEmit(files);
  }, [validateAndEmit]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) validateAndEmit(files);
  }, [validateAndEmit]);

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 sm:p-16 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? "border-foreground bg-accent"
            : "border-border hover:border-muted-foreground"
        }`}
      >
        <Upload className="mx-auto mb-4 text-muted-foreground" size={32} strokeWidth={1.5} />
        <p className="font-heading text-xl text-foreground mb-2">
          {label || "Drop your file here"}
        </p>
        <p className="text-sm font-mono text-muted-foreground">
          or click to browse
        </p>
        <p className="text-xs font-mono text-muted-foreground mt-3">
          Supports: {accept === '.pdf' ? `PDF files up to ${MAX_SIZE_MB}MB` : 'JPG, PNG images'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
      </div>
      {error && (
        <p className="text-xs font-mono text-destructive mt-3 text-center">{error}</p>
      )}
    </div>
  );
}
