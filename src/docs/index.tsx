import { Routes, Route } from 'react-router-dom';
import { ManualList } from './components/admin/ManualList';
import { ManualEditor } from './components/admin/ManualEditor';
import { PageEditor } from './components/admin/PageEditor';

export function DocsAdmin() {
  return (
    <Routes>
      <Route index element={<ManualList />} />
      <Route path=":manualId" element={<ManualEditor />} />
      <Route path=":manualId/pages/:pageId" element={<PageEditor />} />
    </Routes>
  );
}

export { DocReader } from './components/reader/DocReader';
