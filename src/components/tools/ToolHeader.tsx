import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface ToolHeaderProps {
  title: string;
  description?: string;
}

export function ToolHeader({ title, description }: ToolHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 text-xs text-txt-muted mb-2 font-mono">
        <Link to="/" className="hover:text-accent transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-txt-secondary">{title}</span>
      </div>
      <h1 className="font-mono text-2xl font-bold">{title}</h1>
      {description && (
        <p className="text-sm text-txt-secondary mt-1">{description}</p>
      )}
    </div>
  );
}
