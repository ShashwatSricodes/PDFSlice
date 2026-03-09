import { useNavigate, useLocation } from "react-router-dom";
import { tools, categories, type ToolCategory } from "@/lib/toolsData";
import {
  Layers, Scissors, Trash2, ArrowUpDown, RotateCw,
  Image, FileImage, FileText, Minimize2, Wrench,
  Lock, Unlock, Droplets, Hash, FilePlus, Crop,
  FolderOpen, RefreshCw, Zap, Shield, PenTool, LayoutGrid, Workflow
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Layers, Scissors, Trash2, ArrowUpDown, RotateCw,
  Image, FileImage, FileText, Minimize2, Wrench,
  Lock, Unlock, Droplets, Hash, FilePlus, Crop,
  FolderOpen, RefreshCw, Zap, Shield, PenTool, LayoutGrid,
};

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTool = location.pathname.replace("/tool/", "");

  const handleNav = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <nav className="h-full overflow-y-auto py-4 px-3">
      <button
        onClick={() => handleNav("/")}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-mono transition-colors mb-2 ${
          location.pathname === "/" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent"
        }`}
      >
        <LayoutGrid size={16} strokeWidth={1.5} />
        <span style={{ color: '#5167FC' }}>All Tools</span>
      </button>

      <div className="h-px bg-sidebar-border my-3" />

      {categories.map((cat) => {
        const CatIcon = iconMap[cat.icon] || FolderOpen;
        const catTools = tools.filter(t => t.category === cat.id);
        return (
          <div key={cat.id} className="mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              <CatIcon size={14} strokeWidth={1.5} />
              {cat.label}
            </div>
            {catTools.map((tool) => {
              const ToolIcon = iconMap[tool.icon] || FileText;
              const isActive = currentTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleNav(`/tool/${tool.id}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
                    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <ToolIcon size={15} strokeWidth={1.5} />
                  {tool.name}
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
