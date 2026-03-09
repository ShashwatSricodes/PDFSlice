import { Search, Menu } from "lucide-react";
import logo from "@/assets/logo.png";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface NavbarProps {
  onMenuToggle?: () => void;
}

export function Navbar({ onMenuToggle }: NavbarProps) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/?q=${encodeURIComponent(search)}`);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-card border-b border-border flex items-center px-4 md:px-6 gap-3 md:gap-4 card-shadow">
      {isMobile && (
        <button
          onClick={onMenuToggle}
          className="shrink-0 p-1.5 -ml-1 rounded-lg hover:bg-accent transition-colors"
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>
      )}

      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1.5 shrink-0"
      >
        <img src={logo} alt="PDFSlice" className="h-8 w-8 object-contain" />
        <span className="font-heading text-xl font-bold text-foreground">
          <span style={{ color: "#5167FC" }}>PDF</span>Slice
        </span>
      </button>

      <form
        onSubmit={handleSearch}
        className="flex-1 max-w-md mx-auto relative hidden sm:block"
      >
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={16}
          strokeWidth={1.5}
        />
        <input
          type="text"
          placeholder="Search tools..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-full border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </form>

      <div className="ml-auto" />
    </header>
  );
}
