import { useState } from 'react';
import { ConnectorList } from './components/ConnectorList';
import { ConnectorDetail } from './components/ConnectorDetail';

export default function GlobalConnector() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return <ConnectorDetail connectorId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return <ConnectorList onSelect={setSelectedId} />;
}
