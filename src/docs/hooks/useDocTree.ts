import { supabase } from '@/lib/supabase';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function useDocTree(manualId: string | undefined, onRefresh: () => void) {
  const addPage = async (parentId: string | null, title: string) => {
    if (!manualId) return null;

    // Get current max sort_order among siblings
    const query = supabase
      .from('doc_pages')
      .select('sort_order')
      .eq('manual_id', manualId)
      .order('sort_order', { ascending: false })
      .limit(1);

    if (parentId) {
      query.eq('parent_id', parentId);
    } else {
      query.is('parent_id', null);
    }

    const { data: siblings } = await query;
    const nextOrder = siblings && siblings.length > 0 ? siblings[0].sort_order + 1 : 0;

    const { data, error } = await supabase
      .from('doc_pages')
      .insert({
        manual_id: manualId,
        parent_id: parentId,
        title,
        slug: slugify(title),
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) return null;
    onRefresh();
    return data;
  };

  const deletePage = async (pageId: string) => {
    const { error } = await supabase
      .from('doc_pages')
      .delete()
      .eq('id', pageId);

    if (error) return false;
    onRefresh();
    return true;
  };

  const renamePage = async (pageId: string, title: string) => {
    const { error } = await supabase
      .from('doc_pages')
      .update({ title, slug: slugify(title) })
      .eq('id', pageId);

    if (error) return false;
    onRefresh();
    return true;
  };

  const movePage = async (pageId: string, newParentId: string | null, newSortOrder: number) => {
    const { error } = await supabase
      .from('doc_pages')
      .update({ parent_id: newParentId, sort_order: newSortOrder })
      .eq('id', pageId);

    if (error) return false;
    onRefresh();
    return true;
  };

  const reorderSiblings = async (orderedIds: string[]) => {
    const updates = orderedIds.map((id, index) =>
      supabase.from('doc_pages').update({ sort_order: index }).eq('id', id)
    );
    await Promise.all(updates);
    onRefresh();
  };

  return { addPage, deletePage, renamePage, movePage, reorderSiblings };
}
