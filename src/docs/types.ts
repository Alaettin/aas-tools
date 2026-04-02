export interface Manual {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string;
  icon_color: string;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocPage {
  id: string;
  manual_id: string;
  parent_id: string | null;
  title: string;
  slug: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DocTreeNode extends DocPage {
  children: DocTreeNode[];
}
