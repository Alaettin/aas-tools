import { Routes, Route } from 'react-router-dom';
import { McpServerList } from './components/McpServerList';
import { McpServerDetail } from './components/McpServerDetail';

export default function AasMcp() {
  return (
    <Routes>
      <Route index element={<McpServerList />} />
      <Route path=":serverId" element={<McpServerDetail />} />
    </Routes>
  );
}
