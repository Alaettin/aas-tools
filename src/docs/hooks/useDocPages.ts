import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { DocPage, DocTreeNode } from '../types';

function buildTree(pages: DocPage[]): DocTreeNode[] {
  const map = new Map<string, DocTreeNode>();
  const roots: DocTreeNode[] = [];

  for (const p of pages) {
    map.set(p.id, { ...p, children: [] });
  }

  for (const p of pages) {
    const node = map.get(p.id)!;
    if (p.parent_id && map.has(p.parent_id)) {
      map.get(p.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortChildren = (nodes: DocTreeNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    for (const n of nodes) sortChildren(n.children);
  };
  sortChildren(roots);

  return roots;
}

function findPageBySlugPath(tree: DocTreeNode[], slugs: string[]): DocTreeNode | null {
  if (slugs.length === 0) return tree[0] || null;

  let current = tree;
  let found: DocTreeNode | null = null;

  for (const slug of slugs) {
    found = current.find(n => n.slug === slug) || null;
    if (!found) return null;
    current = found.children;
  }

  return found;
}

function getFirstPage(tree: DocTreeNode[]): DocTreeNode | null {
  if (tree.length === 0) return null;
  return tree[0];
}

export function useDocPages(manualId: string | undefined) {
  const [flatPages, setFlatPages] = useState<DocPage[]>([]);
  const [tree, setTree] = useState<DocTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!manualId) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('doc_pages')
      .select('*')
      .eq('manual_id', manualId)
      .order('sort_order', { ascending: true });

    if (err) {
      setError('Seiten konnten nicht geladen werden.');
      setLoading(false);
      return;
    }

    const pages = data as DocPage[];
    setFlatPages(pages);
    setTree(buildTree(pages));
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    if (!manualId) { setLoading(false); return; }

    (async () => {
      const { data, error: err } = await supabase
        .from('doc_pages')
        .select('*')
        .eq('manual_id', manualId)
        .order('sort_order', { ascending: true });

      if (!mounted) return;
      if (err) {
        setError('Seiten konnten nicht geladen werden.');
      } else {
        const pages = data as DocPage[];
        setFlatPages(pages);
        setTree(buildTree(pages));
      }
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [manualId]);

  return { tree, flatPages, loading, error, refresh: load, findPageBySlugPath, getFirstPage };
}
