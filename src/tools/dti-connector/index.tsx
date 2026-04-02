import { Routes, Route } from 'react-router-dom';
import { ConnectorList } from './components/ConnectorList';
import { ConnectorDetail } from './components/ConnectorDetail';

export default function DtiConnector() {
  return (
    <Routes>
      <Route index element={<ConnectorList />} />
      <Route path=":connectorId" element={<ConnectorDetail />} />
    </Routes>
  );
}
