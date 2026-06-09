import { Routes, Route } from 'react-router-dom';
import { ProxyList } from './components/ProxyList';
import { ProxyDetail } from './components/ProxyDetail';

export default function ConnectorProxy() {
  return (
    <Routes>
      <Route index element={<ProxyList />} />
      <Route path=":proxyId" element={<ProxyDetail />} />
    </Routes>
  );
}
