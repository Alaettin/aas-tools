import { Loader2 } from 'lucide-react';

export function ToolSkeleton() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-accent animate-spin" />
    </div>
  );
}
