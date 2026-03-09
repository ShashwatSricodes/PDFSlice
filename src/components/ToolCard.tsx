import { useNavigate } from "react-router-dom";
import { type Tool, categoryColors } from "@/lib/toolsData";
import {
  Layers, Scissors, Trash2, ArrowUpDown, RotateCw,
  Image, FileImage, FileText, Minimize2, Wrench,
  Lock, Unlock, Droplets, Hash, FilePlus, Crop,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Layers, Scissors, Trash2, ArrowUpDown, RotateCw,
  Image, FileImage, FileText, Minimize2, Wrench,
  Lock, Unlock, Droplets, Hash, FilePlus, Crop,
};

export function ToolCard({ tool }: { tool: Tool }) {
  const navigate = useNavigate();
  const Icon = iconMap[tool.icon] || FileText;
  const colors = categoryColors[tool.category];

  return (
    <button
      onClick={() => navigate(`/tool/${tool.id}`)}
      className="w-full text-left bg-card border border-border rounded-xl p-6 card-shadow hover:card-shadow-hover hover:-translate-y-0.5 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Icon size={20} strokeWidth={1.5} className="text-foreground" />
          </div>
          <h3 className="font-heading text-lg text-card-foreground">{tool.name}</h3>
        </div>
        <span className={`text-[10px] font-mono font-medium uppercase tracking-wider px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
          {tool.category}
        </span>
      </div>

      <p className="text-sm font-mono text-muted-foreground mb-5 leading-relaxed">
        {tool.description}
      </p>

      <div className="border-t border-border pt-4 flex justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-0.5">Input</span>
          <span className="text-xs font-mono text-card-foreground">{tool.inputLabel}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-0.5">Output</span>
          <span className="text-xs font-mono text-card-foreground">{tool.outputLabel}</span>
        </div>
      </div>
    </button>
  );
}
