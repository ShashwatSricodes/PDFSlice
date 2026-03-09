import { ChevronUp, ChevronDown, X } from "lucide-react";
import { getToolById, categoryColors } from "@/lib/toolsData";
import type { PipelineStep, PipelineResult, StepSettings } from "@/lib/pipeline";

interface PipelineStepCardProps {
  step: PipelineStep;
  index: number;
  total: number;
  result?: PipelineResult;
  onChange: (id: string, settings: StepSettings) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function PipelineStepCard({
  step, index, total, result,
  onChange, onRemove, onMoveUp, onMoveDown,
}: PipelineStepCardProps) {
  const tool = getToolById(step.toolId);
  if (!tool) return null;
  const colors = categoryColors[tool.category];

  const inputClass = "w-full px-4 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring";
  const labelClass = "text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-2";

  const updateSetting = (partial: Partial<StepSettings>) => {
    onChange(step.id, { ...step.settings, ...partial });
  };

  const renderSettings = () => {
    switch (step.toolId) {
      case 'watermark':
        return (
          <div className="space-y-3 mt-4">
            <div>
              <label className={labelClass}>Watermark Text</label>
              <input value={step.settings.watermarkText ?? 'CONFIDENTIAL'}
                onChange={(e) => updateSetting({ watermarkText: e.target.value })}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Opacity: {Math.round((step.settings.watermarkOpacity ?? 0.3) * 100)}%</label>
              <input type="range" min="0.05" max="1" step="0.05"
                value={step.settings.watermarkOpacity ?? 0.3}
                onChange={(e) => updateSetting({ watermarkOpacity: Number(e.target.value) })}
                className="w-full" />
            </div>
          </div>
        );
      case 'rotate':
        return (
          <div className="mt-4">
            <label className={labelClass}>Rotation</label>
            <select value={step.settings.rotateAllDegrees ?? 90}
              onChange={(e) => updateSetting({ rotateAllDegrees: Number(e.target.value) })}
              className={inputClass}>
              <option value={90}>90° clockwise</option>
              <option value={-90}>90° counter-clockwise</option>
              <option value={180}>180°</option>
            </select>
          </div>
        );
      case 'protect':
        return (
          <div className="mt-4">
            <label className={labelClass}>Password</label>
            <input type="password" value={step.settings.password ?? ''}
              onChange={(e) => updateSetting({ password: e.target.value })}
              placeholder="Enter password"
              className={inputClass} />
          </div>
        );
      case 'crop':
        return (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {(['top', 'right', 'bottom', 'left'] as const).map(side => (
              <div key={side}>
                <label className={labelClass}>{side} (pt)</label>
                <input type="number"
                  value={step.settings.margins?.[side] ?? 0}
                  onChange={(e) => updateSetting({
                    margins: { ...(step.settings.margins ?? { top: 0, right: 0, bottom: 0, left: 0 }), [side]: Number(e.target.value) }
                  })}
                  className={inputClass} />
              </div>
            ))}
          </div>
        );
      default:
        return (
          <p className="text-xs font-mono text-muted-foreground mt-4">No configuration needed</p>
        );
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 card-shadow relative">
      {/* Shimmer when running */}
      {!result && index >= 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-xl opacity-0" />
      )}

      <div className="flex items-start gap-4">
        {/* Step number */}
        <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-foreground">{tool.name}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${colors.bg} ${colors.text}`}>
              {tool.category}
            </span>
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{tool.description}</p>
          {renderSettings()}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button disabled={index === 0} onClick={() => onMoveUp(step.id)}
            className="p-1 hover:bg-accent rounded disabled:opacity-30 text-muted-foreground">
            <ChevronUp size={14} strokeWidth={1.5} />
          </button>
          <button disabled={index === total - 1} onClick={() => onMoveDown(step.id)}
            className="p-1 hover:bg-accent rounded disabled:opacity-30 text-muted-foreground">
            <ChevronDown size={14} strokeWidth={1.5} />
          </button>
          <button onClick={() => onRemove(step.id)}
            className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Result row */}
      {result && (
        <div className={`mt-3 pt-3 border-t border-border text-xs font-mono ${result.success ? 'text-green-700' : 'text-destructive'}`}>
          {result.success
            ? `✓ Done in ${(result.durationMs / 1000).toFixed(1)}s — ${formatSize(result.outputSize)}`
            : `✕ Failed: ${result.error}`}
        </div>
      )}
    </div>
  );
}
