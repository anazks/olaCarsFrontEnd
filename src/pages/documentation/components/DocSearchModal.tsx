import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, ChevronRight, Hash, ArrowUpDown, CornerDownLeft } from 'lucide-react';
import { searchDocumentation } from '../../../data/documentation/searchIndex';
import { docCategories } from '../../../data/documentation/docRegistry';
import type { SearchResult } from '../../../data/documentation/types';

interface DocSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTopic: (topicId: string, sectionId?: string) => void;
}

export const DocSearchModal: React.FC<DocSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTopic
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim()) {
      const searchRes = searchDocumentation(query, selectedCategory || undefined);
      setResults(searchRes);
      setSelectedIndex(0);
    } else {
      setResults([]);
      setSelectedIndex(0);
    }
  }, [query, selectedCategory]);

  // Keyboard navigation inside modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          const item = results[selectedIndex];
          onSelectTopic(item.topicId, item.sectionId);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, onSelectTopic]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-main)] bg-[var(--bg-card)]">
          <Search className="w-5 h-5 text-[#C8E600]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search processes, steps, rules, or keywords... (e.g., 'vehicle handover', 'journal', 'VAT')"
            className="flex-1 bg-transparent text-sm text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[var(--text-dim)] hover:text-[var(--text-main)] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[var(--bg-sidebar)] border border-[var(--border-main)] text-[var(--text-dim)]">
            ESC
          </kbd>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 overflow-x-auto border-b border-[var(--border-main)] bg-[var(--bg-sidebar)] text-xs scrollbar-none">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
              selectedCategory === ''
                ? 'bg-[#C8E600] text-black font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--sidebar-hover)]'
            }`}
          >
            All Modules
          </button>
          {docCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#C8E600] text-black font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--sidebar-hover)]'
              }`}
            >
              {cat.title}
            </button>
          ))}
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {query.trim() === '' ? (
            <div className="py-12 text-center text-sm text-[var(--text-dim)]">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#C8E600]" />
              <p>Type a keyword to search through all OlaCars process guides.</p>
              <p className="text-xs text-[var(--text-dim)] mt-1">
                Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-sidebar)] border border-[var(--border-main)]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-sidebar)] border border-[var(--border-main)]">K</kbd> anytime to open this search.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--text-dim)]">
              <p>No documentation found matching &ldquo;<span className="text-[var(--text-main)]">{query}</span>&rdquo;</p>
              <p className="text-xs mt-1">Try broader terms like &quot;fleet&quot;, &quot;driver&quot;, &quot;invoice&quot;, or &quot;reconciliation&quot;.</p>
            </div>
          ) : (
            results.map((res, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${res.topicId}-${res.sectionId || 'top'}-${idx}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    onSelectTopic(res.topicId, res.sectionId);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-[#C8E600]/10 border-[#C8E600]/50'
                      : 'border-transparent hover:bg-[var(--sidebar-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-[#C8E600] bg-[#C8E600]/10 px-2 py-0.5 rounded">
                        {res.categoryTitle}
                      </span>
                      <ChevronRight className="w-3 h-3 text-[var(--text-dim)]" />
                      <span className="font-medium text-[var(--text-main)]">
                        {res.topicTitle}
                      </span>
                      {res.sectionTitle && (
                        <>
                          <ChevronRight className="w-3 h-3 text-[var(--text-dim)]" />
                          <span className="flex items-center gap-1 text-[var(--text-dim)]">
                            <Hash className="w-3 h-3" />
                            {res.sectionTitle}
                          </span>
                        </>
                      )}
                    </div>
                    {isSelected && (
                      <span className="hidden sm:flex items-center gap-1 text-[11px] text-[#C8E600]">
                        <span>Open</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 pl-0.5">
                    {res.snippet}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Keyboard Hints */}
        <div className="px-5 py-2.5 bg-[var(--bg-sidebar)] border-t border-[var(--border-main)] flex items-center justify-between text-[11px] text-[var(--text-dim)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> Navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> Select
            </span>
          </div>
          <span>
            {results.length > 0 ? `${results.length} results found` : 'Interactive Process Guide'}
          </span>
        </div>
      </div>
    </div>
  );
};
