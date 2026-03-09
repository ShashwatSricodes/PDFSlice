import { HashRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Home from "./pages/Home";
import ToolPage from "./pages/ToolPage";
import { useIsMobile } from "./hooks/use-mobile";
import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "./components/ui/sheet";

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        if (!window.location.pathname.includes('/tool/')) return;
        e.preventDefault();
        document.getElementById('global-file-input')?.click();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <ErrorBoundary>
      <HashRouter>
        <div className="min-h-screen bg-background flex flex-col">
          <Navbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />
          <div className="flex flex-1">
            {!isMobile && (
              <aside className="fixed left-0 top-16 bottom-0 w-[280px] bg-sidebar border-r border-sidebar-border">
                <Sidebar />
              </aside>
            )}

            {isMobile && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent side="left" className="w-[280px] p-0 bg-sidebar overflow-y-auto">
                  <div className="pt-4 flex flex-col h-full">
                    <div className="flex-1">
                      <Sidebar onNavigate={() => setSidebarOpen(false)} />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            <main className={`flex-1 mt-[64px] ${!isMobile ? 'ml-[280px]' : ''}`}>
              <div className="animate-fade-in-up">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/tool/:toolId" element={<ToolPage />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;
