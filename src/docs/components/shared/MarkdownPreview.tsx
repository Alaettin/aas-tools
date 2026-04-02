import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  return (
    <div className={`prose prose-invert prose-sm max-w-none
      prose-headings:font-mono prose-headings:text-txt-primary
      prose-h1:text-xl prose-h1:border-b prose-h1:border-border prose-h1:pb-2
      prose-h2:text-lg
      prose-p:text-txt-secondary prose-p:leading-relaxed
      prose-a:text-accent prose-a:no-underline hover:prose-a:underline
      prose-strong:text-txt-primary
      prose-code:text-accent prose-code:bg-bg-elevated prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-bg-input prose-pre:border prose-pre:border-border prose-pre:rounded-sm
      prose-blockquote:border-accent prose-blockquote:text-txt-muted
      prose-li:text-txt-secondary
      prose-table:text-sm
      prose-th:text-txt-primary prose-th:border-border prose-th:px-3 prose-th:py-2
      prose-td:border-border prose-td:px-3 prose-td:py-2
      prose-img:rounded-sm prose-img:border prose-img:border-border
      prose-hr:border-border
      ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
