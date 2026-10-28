import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Menu,
  Tag,
  Share2,
  Check
} from 'lucide-react';
import {
  getAllCategories,
  getTopicById,
  getAdjacentTopics,
  getCategoryById
} from '../../data/documentation/docRegistry';
import { DocSidebar } from './components/DocSidebar';
import { DocTableOfContents } from './components/DocTableOfContents';
import { DocStepGuide } from './components/DocStepGuide';
import { DocCallout } from './components/DocCallout';
import { DocSearchModal } from './components/DocSearchModal';

const DocumentationPage: React.FC = () => {
  const { topicId } = useParams<{ topicId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Compute the clean base documentation URL (e.g. "/admin/admin/documentation")
  const getDocBasePath = () => {
    const idx = location.pathname.indexOf('/documentation');
    if (idx !== -1) {
      return location.pathname.substring(0, idx + '/documentation'.length);
    }
    return '/admin/admin/documentation';
  };

  // Determine active topic: from topicId param, or last path segment if path was duplicated
  const getInitialTopicId = () => {
    if (topicId && topicId !== 'documentation') {
      return topicId;
    }
    const segments = location.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last !== 'documentation' && getTopicById(last)) {
      return last;
    }
    return 'system-overview';
  };

  const [currentTopicId, setCurrentTopicId] = useState<string>(getInitialTopicId());
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Self-heal duplicate "/documentation/documentation" URLs immediately
  useEffect(() => {
    if (location.pathname.includes('/documentation/documentation')) {
      const cleanedPath = location.pathname.replace(/\/documentation(\/documentation)+/g, '/documentation');
      navigate(cleanedPath, { replace: true });
    }
  }, [location.pathname, navigate]);

  // Sync state if URL changes
  useEffect(() => {
    const activeId = getInitialTopicId();
    setCurrentTopicId(activeId);
  }, [location.pathname, topicId]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = getAllCategories();
  const topic = getTopicById(currentTopicId) || getTopicById('system-overview')!;
  const currentCategory = getCategoryById(topic.categoryId);
  const { prev: prevTopic, next: nextTopic } = getAdjacentTopics(topic.id);

  const handleSelectTopic = (id: string, sectionId?: string) => {
    setCurrentTopicId(id);
    const basePath = getDocBasePath();
    navigate(`${basePath}/${id}`);

    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-120px)] -m-6 bg-[var(--bg-main)] text-[var(--text-main)]">
      {/* Documentation Sidebar */}
      <DocSidebar
        categories={categories}
        currentTopicId={topic.id}
        onSelectTopic={handleSelectTopic}
        onOpenSearch={() => setIsSearchOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Documentation Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto px-6 lg:px-12 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Top Header & Breadcrumb */}
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border-main)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-dim)] flex-wrap">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden p-1.5 rounded-lg border border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] mr-1"
                title="Open Docs Menu"
              >
                <Menu className="w-4 h-4 text-[#C8E600]" />
              </button>
              <span className="flex items-center gap-1 font-semibold text-[var(--text-muted)]">
                <BookOpen className="w-3.5 h-3.5 text-[#C8E600]" /> Docs
              </span>
              <ChevronRight className="w-3 h-3" />
              <span>{currentCategory?.title}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-[#C8E600] font-medium">{topic.shortTitle || topic.title}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-main)] bg-[var(--bg-card)] hover:border-[#C8E600]/40 transition-colors"
                title="Copy permanent link to topic"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-[var(--text-dim)]" />
                    <span className="text-[var(--text-muted)]">Share</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Topic Header Title & Description */}
          <header className="mb-10">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 text-[var(--text-main)]">
              {topic.title}
            </h1>
            <p className="text-base text-[var(--text-muted)] leading-relaxed mb-4">
              {topic.description}
            </p>

            {/* Tags & Action Links */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {topic.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-dim)]"
                >
                  <Tag className="w-2.5 h-2.5 opacity-60" />
                  {tag}
                </span>
              ))}

              {topic.relatedRoutes && topic.relatedRoutes.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  <span className="text-xs text-[var(--text-dim)]">Jump to screen:</span>
                  {topic.relatedRoutes.map((route) => (
                    <button
                      key={route.path}
                      onClick={() => navigate(route.path)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#C8E600]/15 text-[#C8E600] border border-[#C8E600]/30 hover:bg-[#C8E600] hover:text-black transition-all"
                    >
                      <span>{route.label}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </header>

          {/* Two-Column Layout: Topic Content + Sticky TOC */}
          <div className="flex gap-10 items-start">
            {/* Topic Sections */}
            <div className="flex-1 min-w-0 space-y-12">
              {topic.sections.map((sec) => (
                <section key={sec.id} id={sec.id} className="scroll-mt-8">
                  <h2 className="text-xl font-bold tracking-tight text-[var(--text-main)] mb-3 pb-2 border-b border-[var(--border-main)] flex items-center justify-between">
                    <span>{sec.title}</span>
                    <a
                      href={`#${sec.id}`}
                      className="text-xs text-[var(--text-dim)] hover:text-[#C8E600] opacity-40 hover:opacity-100 transition-opacity"
                      title="Link to section"
                    >
                      #
                    </a>
                  </h2>

                  <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
                    {sec.content}
                  </p>

                  {/* Steps rendering if defined */}
                  {sec.steps && sec.steps.length > 0 && (
                    <DocStepGuide steps={sec.steps} />
                  )}

                  {/* Pro tips callout */}
                  {sec.tips && sec.tips.length > 0 && (
                    <DocCallout type="tip" title="Tips & Best Practices">
                      <ul className="list-disc list-inside space-y-1">
                        {sec.tips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </DocCallout>
                  )}

                  {/* Warnings callout */}
                  {sec.warnings && sec.warnings.length > 0 && (
                    <DocCallout type="warning" title="Critical Validation Rule">
                      <ul className="list-disc list-inside space-y-1">
                        {sec.warnings.map((warn, idx) => (
                          <li key={idx}>{warn}</li>
                        ))}
                      </ul>
                    </DocCallout>
                  )}
                </section>
              ))}

              {/* Prev / Next Topic Navigation */}
              <div className="pt-8 border-t border-[var(--border-main)] flex items-center justify-between gap-4">
                {prevTopic ? (
                  <button
                    onClick={() => handleSelectTopic(prevTopic.id)}
                    className="flex-1 max-w-[280px] p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] hover:border-[#C8E600]/40 transition-all text-left group"
                  >
                    <span className="flex items-center gap-1 text-[11px] text-[var(--text-dim)] mb-1">
                      <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                      Previous Process
                    </span>
                    <span className="block text-sm font-semibold text-[var(--text-main)] group-hover:text-[#C8E600] truncate transition-colors">
                      {prevTopic.shortTitle || prevTopic.title}
                    </span>
                  </button>
                ) : (
                  <div className="flex-1" />
                )}

                {nextTopic ? (
                  <button
                    onClick={() => handleSelectTopic(nextTopic.id)}
                    className="flex-1 max-w-[280px] p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] hover:border-[#C8E600]/40 transition-all text-right group"
                  >
                    <span className="flex items-center justify-end gap-1 text-[11px] text-[var(--text-dim)] mb-1">
                      Next Process
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                    <span className="block text-sm font-semibold text-[var(--text-main)] group-hover:text-[#C8E600] truncate transition-colors">
                      {nextTopic.shortTitle || nextTopic.title}
                    </span>
                  </button>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </div>

            {/* Right Side Table of Contents */}
            <DocTableOfContents sections={topic.sections} />
          </div>
        </div>
      </main>

      {/* Instant Search Modal (Ctrl + K) */}
      <DocSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTopic={handleSelectTopic}
      />
    </div>
  );
};

export default DocumentationPage;
