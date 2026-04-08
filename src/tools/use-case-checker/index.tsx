import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutGrid, Database, CheckSquare } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { OverviewPage } from './components/OverviewPage';
import { SourcesPage } from './components/SourcesPage';
import { UseCasesPage } from './components/UseCasesPage';

export default function UseCaseChecker() {
  const { t } = useLocale();

  const tabs = [
    { path: '', label: t('ucc.tabOverview'), icon: LayoutGrid, end: true },
    { path: 'sources', label: t('ucc.tabSources'), icon: Database, end: true },
    { path: 'use-cases', label: t('ucc.tabUseCases'), icon: CheckSquare, end: true },
  ];
  return (
    <div className="max-w-5xl animate-fade-in">
      {/* Header */}
      <div className="mb-2">
        <h1 className="font-mono text-2xl font-bold">Use Case Checker</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-border mb-6">
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.end}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-txt-muted hover:text-txt-primary'
              }`
            }
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* Routes */}
      <Routes>
        <Route index element={<OverviewPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="use-cases" element={<UseCasesPage />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </div>
  );
}
