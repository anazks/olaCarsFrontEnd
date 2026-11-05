import React, { useState } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  BookOpen,
  LayoutGrid,
  Car,
  Users,
  Receipt,
  Calculator,
  ShoppingBag,
  Wrench,
  ShieldCheck,
  UploadCloud,
  Video,
  ExternalLink
} from 'lucide-react';
import type { DocCategory } from '../../../data/documentation/types';

interface DocSidebarProps {
  categories: DocCategory[];
  currentTopicId: string;
  onSelectTopic: (topicId: string) => void;
  onOpenSearch: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  LayoutGrid: <LayoutGrid className="w-4 h-4" />,
  Car: <Car className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  Receipt: <Receipt className="w-4 h-4" />,
  Calculator: <Calculator className="w-4 h-4" />,
  ShoppingBag: <ShoppingBag className="w-4 h-4" />,
  Wrench: <Wrench className="w-4 h-4" />,
  ShieldCheck: <ShieldCheck className="w-4 h-4" />,
  UploadCloud: <UploadCloud className="w-4 h-4" />,
  Video: <Video className="w-4 h-4" />
};

export const DocSidebar: React.FC<DocSidebarProps> = ({
  categories,
  currentTopicId,
  onSelectTopic,
  onOpenSearch,
  isOpenMobile,
  onCloseMobile
}) => {
  // Track open/collapsed categories
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    categories.forEach((cat) => {
      initial[cat.id] = true;
    });
    return initial;
  });

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const content = (
    <div className="flex flex-col h-full bg-[var(--bg-card)] border-r border-[var(--border-main)]">
      {/* Search Bar Button */}
      <div className="p-4 border-b border-[var(--border-main)]">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] hover:border-[#C8E600]/60 text-xs text-[var(--text-muted)] transition-all shadow-sm group"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-[#C8E600] group-hover:scale-110 transition-transform" />
            <span>Search docs...</span>
          </div>
          <kbd className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-dim)]">
            Ctrl K
          </kbd>
        </button>

        {/* Video Recordings Quick Link */}
        <a
          href="https://drive.google.com/drive/folders/1CzrC0X34JnoxZ4wuWFuMNWCmTHKeO8w4?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl border border-[#C8E600]/30 bg-[#C8E600]/10 hover:bg-[#C8E600]/20 text-xs font-semibold text-[#C8E600] transition-colors group"
          title="Open Video Recordings for Ola Process Steps (Google Drive)"
        >
          <div className="flex items-center gap-2 truncate">
            <Video className="w-4 h-4 shrink-0 text-[#C8E600]" />
            <span className="truncate">Process Step Videos</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </a>
      </div>

      {/* Categories & Topics Tree */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {categories.map((cat) => {
          const isOpen = openCategories[cat.id] !== false;
          const hasActiveTopic = cat.topics.some((t) => t.id === currentTopicId);

          return (
            <div key={cat.id} className="space-y-1">
              <button
                onClick={() => toggleCategory(cat.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                  hasActiveTopic
                    ? 'text-[#C8E600]'
                    : 'text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--sidebar-hover)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#C8E600]">
                    {iconMap[cat.iconName] || <BookOpen className="w-4 h-4" />}
                  </span>
                  <span>{cat.title}</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                )}
              </button>

              {isOpen && (
                <div className="pl-4 space-y-0.5 border-l border-[var(--border-main)] ml-3 my-1">
                  {cat.topics.map((topic) => {
                    const isActive = topic.id === currentTopicId;
                    return (
                      <button
                        key={topic.id}
                        onClick={() => {
                          onSelectTopic(topic.id);
                          if (onCloseMobile) onCloseMobile();
                        }}
                        className={`w-full text-left py-1.5 px-3 rounded-lg text-xs transition-all truncate block ${
                          isActive
                            ? 'bg-[#C8E600]/15 text-[#C8E600] font-semibold border-l-2 border-[#C8E600]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--sidebar-hover)]'
                        }`}
                        title={topic.title}
                      >
                        {topic.shortTitle || topic.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Drive Banner */}
      <div className="p-3 border-t border-[var(--border-main)] bg-[var(--bg-main)]/60">
        <div className="p-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] text-xs">
          <div className="flex items-center gap-2 font-semibold text-[var(--text-main)] mb-1">
            <Video className="w-3.5 h-3.5 text-[#C8E600]" />
            <span>Ola Process Videos</span>
          </div>
          <p className="text-[11px] text-[var(--text-dim)] mb-2">
            Watch recorded walkthroughs of system process steps.
          </p>
          <a
            href="https://drive.google.com/drive/folders/1CzrC0X34JnoxZ4wuWFuMNWCmTHKeO8w4?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-[#C8E600] text-black hover:bg-[#b0cc00] transition-colors"
          >
            <span>Open Google Drive</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="w-72 hidden md:block flex-shrink-0 h-[calc(100vh-80px)] sticky top-0">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-80 max-w-full h-full z-10">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
