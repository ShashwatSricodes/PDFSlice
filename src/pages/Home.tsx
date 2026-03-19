import { useSearchParams } from "react-router-dom";
import { tools } from "@/lib/toolsData";
import { ToolCard } from "@/components/ToolCard";
import { Star } from "lucide-react";

export default function Home() {
  const [params] = useSearchParams();
  const query = params.get("q")?.toLowerCase() || "";

  const filtered = query
    ? tools.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
      )
    : tools;

  return (
    <div className="p-4 sm:p-8 lg:p-12">
      <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl sm:text-[42px] lg:text-[52px] leading-tight text-foreground">
            <span style={{ color: '#5167FC' }}>PDF</span> Tools
          </h1>
          <p className="text-sm sm:text-[15px] font-mono text-muted-foreground mt-2">
            All processing happens locally in your browser. Nothing leaves your machine.
          </p>
        </div>
        <a
          href="https://github.com/ShashwatSricodes/PDFSlice"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-sm font-mono text-foreground hover:border-foreground hover:shadow-sm transition-all self-start"
        >
          <Star size={15} strokeWidth={1.5} className="text-amber-500" fill="currentColor" />
          Star us on GitHub
        </a>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm font-mono text-muted-foreground">
            No tools found for '{query}'
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filtered.map(tool => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
