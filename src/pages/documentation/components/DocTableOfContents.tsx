import React, { useEffect, useState } from 'react';
import type { DocSection } from '../../../data/documentation/types';
import { List } from 'lucide-react';

interface DocTableOfContentsProps {
  sections: DocSection[];
}

export const DocTableOfContents: React.FC<DocTableOfContentsProps> = ({ sections }) => {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (sections.length > 0 && !activeId) {
      setActiveId(sections[0].id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );

    sections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
  };

  if (!sections || sections.length === 0) return null;

  return (
    <aside className="w-64 hidden xl:block flex-shrink-0 sticky top-6 h-fit pl-6 border-l border-[var(--border-main)]">
      <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
        <List className="w-3.5 h-3.5 text-[#C8E600]" />
        <span>On This Page</span>
      </div>
      <nav className="space-y-1">
        {sections.map((sec) => {
          const isActive = activeId === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => scrollToSection(sec.id)}
              className={`block w-full text-left py-1.5 px-2.5 rounded-md text-xs transition-colors duration-150 truncate ${
                isActive
                  ? 'text-[#C8E600] font-semibold bg-[#C8E600]/10 border-l-2 border-[#C8E600]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--sidebar-hover)]'
              }`}
            >
              {sec.title}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
