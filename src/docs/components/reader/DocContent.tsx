import { useLocale } from '@/context/LocaleContext';
import { MarkdownPreview } from '../shared/MarkdownPreview';
import type { DocPage } from '../../types';

interface DocContentProps {
  page: DocPage | null;
}

export function DocContent({ page }: DocContentProps) {
  const { t } = useLocale();
  if (!page) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-txt-muted">{t('docs.reader.pageNotFound')}</p>
      </div>
    );
  }

  return (
    <article className="p-8 max-w-3xl">
      <h1 className="font-mono text-2xl font-bold text-txt-primary mb-6 pb-3 border-b border-border">
        {page.title}
      </h1>
      {page.content ? (
        <MarkdownPreview content={page.content} />
      ) : (
        <p className="text-sm text-txt-muted italic">{t('docs.reader.noContent')}</p>
      )}
    </article>
  );
}
