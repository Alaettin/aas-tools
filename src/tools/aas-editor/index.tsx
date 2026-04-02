import { useState } from 'react';
import { ProjectList } from './components/ProjectList';
import { EditorPage } from './components/EditorPage';

export default function AasEditor() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (selectedProjectId) {
    return (
      <EditorPage
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  return <ProjectList onSelect={setSelectedProjectId} />;
}
