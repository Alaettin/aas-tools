import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { DocTreeNode } from '../../types';

interface DocTreeNavProps {
  tree: DocTreeNode[];
  manualSlug: string;
  basePath: string;
}

function TreeNode({
  node,
  parentPath,
  depth,
}: {
  node: DocTreeNode;
  parentPath: string;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const path = `${parentPath}/${node.slug}`;

  return (
    <div>
      <NavLink
        to={path}
        end
        className={({ isActive }) =>
          `group flex items-center h-8 rounded-sm text-[13px] transition-colors ${
            isActive
              ? 'bg-accent/10 text-accent font-medium'
              : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated/60'
          }`
        }
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {({ isActive }) => (
          <>
            {/* Expand/collapse — clickable zone stops propagation */}
            {hasChildren ? (
              <button
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="flex items-center justify-center w-5 h-5 -ml-0.5 mr-1 rounded-sm text-txt-muted hover:text-txt-primary hover:bg-bg-elevated transition-colors"
              >
                {expanded
                  ? <ChevronDown className="w-3.5 h-3.5" />
                  : <ChevronRight className="w-3.5 h-3.5" />
                }
              </button>
            ) : (
              <span className="w-5 mr-1 -ml-0.5" />
            )}

            {/* Dot indicator for leaf nodes / active marker */}
            <span className={`w-1.5 h-1.5 rounded-full mr-2.5 flex-shrink-0 transition-colors ${
              isActive
                ? 'bg-accent'
                : hasChildren
                  ? 'bg-transparent'
                  : 'bg-border group-hover:bg-txt-muted'
            }`} />

            <span className="truncate">{node.title}</span>
          </>
        )}
      </NavLink>

      {expanded && hasChildren && (
        <div className="relative">
          {/* Tree line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-border/40"
            style={{ left: `${depth * 16 + 20}px` }}
          />
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              parentPath={path}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DocTreeNav({ tree, basePath }: DocTreeNavProps) {
  return (
    <nav className="space-y-px">
      {tree.map(node => (
        <TreeNode
          key={node.id}
          node={node}
          parentPath={basePath}
          depth={0}
        />
      ))}
    </nav>
  );
}
