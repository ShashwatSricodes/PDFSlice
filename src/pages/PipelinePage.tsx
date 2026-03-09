import { useState, useEffect } from "react";
import { Zap, Plus, ArrowDown } from "lucide-react";
import { DropZone } from "@/components/DropZone";
import { SuccessState } from "@/components/SuccessState";
import { PipelineStepCard } from "@/components/PipelineStepCard";
import { pipelineTools, getToolById, categoryColors } from "@/lib/toolsData";
import { runPipeline, type PipelineStep, type PipelineResult, type StepSettings } from "@/lib/pipeline";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PipelinePage() {
  useEffect(() => {
    document.title = 'Pipeline — PDFSlice';
    return () => { document.title = 'PDFSlice'; };
  }, []);
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [pipelineState, setPipelineState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [stepResults, setStepResults] = useState<Record<string, PipelineResult>>({});
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [inputSize, setInputSize] = useState(0);
  const [showPicker, setShowPicker] = useState(false);

  const handleFiles = (files: File[]) => {
    if (files[0]) {
      setInputFile(files[0]);
      setInputSize(files[0].size);
    }
  };

  const addStep = (toolId: string) => {
    const defaultSettings: StepSettings = {};
    if (toolId === 'watermark') {
      defaultSettings.watermarkText = 'CONFIDENTIAL';
      defaultSettings.watermarkOpacity = 0.3;
    }
    if (toolId === 'rotate') defaultSettings.rotateAllDegrees = 90;
    if (toolId === 'crop') defaultSettings.margins = { top: 0, right: 0, bottom: 0, left: 0 };

    setSteps(prev => [...prev, {
      id: crypto.randomUUID(),
      toolId,
      settings: defaultSettings,
    }]);
    setShowPicker(false);
  };

  const updateStep = (id: string, settings: StepSettings) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, settings } : s));
  };

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
  };

  const moveStep = (id: string, dir: -1 | 1) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const handleRun = async () => {
    if (!inputFile || steps.length === 0) return;
    setPipelineState("running");
    setStepResults({});

    try {
      const output = await runPipeline(
        inputFile,
        steps,
        (stepId, result) => {
          setStepResults(prev => ({ ...prev, [stepId]: result }));
        }
      );
      setOutputBlob(output);
      setPipelineState("done");
    } catch {
      setPipelineState("error");
    }
  };

  const handleDownload = async () => {
    if (!outputBlob || !inputFile) return;
    const { saveFile } = await import('@/lib/platform');
    const name = inputFile.name.replace('.pdf', '-pipeline.pdf');
    await saveFile(outputBlob, name);
  };

  const handleReset = () => {
    setInputFile(null);
    setInputSize(0);
    setStepResults({});
    setOutputBlob(null);
    setPipelineState("idle");
  };

  return (
    <>
    <div className="p-8 lg:p-12 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-4xl text-foreground">Pipeline</h1>
        <p className="text-sm font-mono text-muted-foreground mt-1">
          Chain tools together. Each step's output becomes the next step's input.
        </p>
      </div>

      {/* Empty state */}
      {!inputFile && steps.length === 0 && (
        <div className="flex flex-col items-center gap-6 py-16 text-center mb-8">
          <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
            <span className="px-3 py-1.5 bg-card border border-border rounded-lg">Compress</span>
            <span>→</span>
            <span className="px-3 py-1.5 bg-card border border-border rounded-lg">Watermark</span>
            <span>→</span>
            <span className="px-3 py-1.5 bg-card border border-border rounded-lg">Protect</span>
            <span>→</span>
            <span className="px-3 py-1.5 bg-card border border-border rounded-lg">Download</span>
          </div>
          <p className="text-sm font-mono text-muted-foreground max-w-sm">
            Drop a PDF, chain your tools, run once. No repeated uploads, no switching tabs.
          </p>
        </div>
      )}

      {/* Section 1: File Drop */}
      {!inputFile ? (
        <DropZone accept=".pdf" multiple={false} onFiles={handleFiles} label="Drop your PDF here" />
      ) : (
        <div className="bg-card border border-border rounded-xl p-4 mb-6 card-shadow">
          <div className="flex items-center justify-between font-mono text-sm">
            <div className="flex items-center gap-3">
              <span className="text-foreground">{inputFile.name}</span>
              <span className="text-muted-foreground">{formatSize(inputFile.size)}</span>
            </div>
            <button onClick={handleReset} className="text-muted-foreground hover:text-destructive p-1">
              <span className="text-xs font-mono">✕</span>
            </button>
          </div>
        </div>
      )}

      {/* Section 2: Steps Builder */}
      {inputFile && (
        <div className="space-y-0 mb-6">
          {steps.map((step, i) => (
            <div key={step.id}>
              <PipelineStepCard
                step={step}
                index={i}
                total={steps.length}
                result={stepResults[step.id]}
                onChange={updateStep}
                onRemove={removeStep}
                onMoveUp={(id) => moveStep(id, -1)}
                onMoveDown={(id) => moveStep(id, 1)}
              />
              {i < steps.length - 1 && (
                <div className="flex justify-center py-2">
                  <ArrowDown size={16} className="text-muted-foreground" strokeWidth={1.5} />
                </div>
              )}
            </div>
          ))}

          {/* Add Step button */}
          <div className={steps.length > 0 ? "pt-2" : ""}>
            {steps.length > 0 && (
              <div className="flex justify-center py-2">
                <ArrowDown size={16} className="text-muted-foreground" strokeWidth={1.5} />
              </div>
            )}
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border text-sm font-mono text-muted-foreground hover:border-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus size={16} strokeWidth={1.5} />
              Add Step
            </button>

            {/* Tool picker */}
            <div className={`overflow-hidden transition-all duration-300 ${showPicker ? 'max-h-[600px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
              <div className="grid grid-cols-2 gap-3 p-4 bg-card border border-border rounded-xl card-shadow">
                {pipelineTools.map(tool => {
                  const colors = categoryColors[tool.category];
                  return (
                    <button
                      key={tool.id}
                      onClick={() => addStep(tool.id)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent text-left transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-medium text-foreground">{tool.name}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono ${colors.bg} ${colors.text}`}>
                            {tool.category}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Run Controls */}
      {inputFile && steps.length > 0 && pipelineState !== "done" && (
        <div className="flex items-center justify-between p-5 bg-card border border-border rounded-xl card-shadow mb-6">
          <div className="font-mono text-sm text-muted-foreground">
            {steps.length} step{steps.length !== 1 ? 's' : ''} · Input: {formatSize(inputSize)}
          </div>
          <button
            onClick={handleRun}
            disabled={pipelineState === "running"}
            className="flex items-center gap-2 px-6 py-2.5 bg-foreground text-background rounded-full text-sm font-mono font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            <Zap className="w-4 h-4" />
            {pipelineState === "running" ? "Running..." : "Run Pipeline"}
          </button>
        </div>
      )}

      {/* Section 4: Output */}
      {pipelineState === "done" && outputBlob && (
        <>
          <SuccessState
            originalSize={inputSize}
            resultSize={outputBlob.size}
            filename={inputFile?.name.replace('.pdf', '-pipeline.pdf') ?? 'output.pdf'}
            onDownload={handleDownload}
          />
          <div className="mt-6 text-center">
            <button
              onClick={() => { setStepResults({}); setOutputBlob(null); setPipelineState("idle"); }}
              className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Run again with same steps →
            </button>
          </div>
        </>
      )}

      {pipelineState === "error" && (
        <div className="bg-card border border-destructive/30 rounded-xl p-6 card-shadow text-center">
          <p className="text-sm font-mono text-destructive">Pipeline failed. Check individual step results above.</p>
          <button
            onClick={() => { setStepResults({}); setOutputBlob(null); setPipelineState("idle"); }}
            className="mt-3 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            Try again →
          </button>
        </div>
      )}
    </div>

    </>
  );
}
