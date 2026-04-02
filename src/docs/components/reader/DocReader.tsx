import { useEffect, useState } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { Loader2, BookOpen } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { supabase } from '@/lib/supabase';
import { useDocPages } from '../../hooks/useDocPages';
import { DocTreeNav } from './DocTreeNav';
import { DocContent } from './DocContent';
import type { Manual, DocPage } from '../../types';

export function DocReader() {
  const { manualSlug } = useParams<{ manualSlug: string }>();
  const location = useLocation();
  const [manual, setManual] = useState<Manual | null>(null);
  const [loadingManual, setLoadingManual] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!manualSlug) return;

    (async () => {
      const { data } = await supabase
        .from('doc_manuals')
        .select('*')
        .eq('slug', manualSlug)
        .single();

      if (!mounted) return;
      setManual(data as Manual | null);
      setLoadingManual(false);
    })();

    return () => { mounted = false; };
  }, [manualSlug]);

  const { t } = useLocale();
  const { tree, loading: loadingPages, findPageBySlugPath, getFirstPage } = useDocPages(manual?.id);

  if (loadingManual || loadingPages) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!manual) {
    return <Navigate to="/" replace />;
  }

  // Extract slug path from URL after /docs/:manualSlug/
  const basePath = `/docs/${manualSlug}`;
  const remainingPath = location.pathname.replace(basePath, '').replace(/^\//, '');
  const slugs = remainingPath ? remainingPath.split('/') : [];

  // Resolve current page from slug path
  let currentPage: DocPage | null = null;
  if (slugs.length > 0) {
    currentPage = findPageBySlugPath(tree, slugs);
  } else {
    currentPage = getFirstPage(tree);
  }

  return (
    <div className="-m-6 flex h-[calc(100vh-64px)] animate-fade-in">
      {/* Left: Tree Navigation */}
      <aside className="w-[260px] border-r border-border overflow-y-auto flex-shrink-0">
        {/* Manual header */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-accent-muted flex items-center justify-center flex-shrink-0">
              <BookOpen className={`w-4 h-4 ${manual.icon_color}`} />
            </div>
            <div className="min-w-0">
              <h2 className="font-mono text-sm font-semibold truncate text-txt-primary">
                {manual.title}
              </h2>
              {manual.description && (
                <p className="text-2xs text-txt-muted truncate">{manual.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-border" />

        {/* Tree */}
        <div className="px-3 py-4">
          {tree.length === 0 ? (
            <p className="text-2xs text-txt-muted px-3 py-4">{t('docs.reader.noPages')}</p>
          ) : (
            <DocTreeNav tree={tree} manualSlug={manualSlug!} basePath={basePath} />
          )}
        </div>
      </aside>

      {/* Right: Content */}
      <main className="flex-1 overflow-y-auto bg-bg-primary">
        <DocContent page={currentPage} />
      </main>
    </div>
  );
}
