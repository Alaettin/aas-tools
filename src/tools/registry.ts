import { lazy, type LazyExoticComponent, type ComponentType } from 'react';

export type ToolStatus = 'active' | 'beta' | 'coming_soon';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconColor: string;
  status: ToolStatus;
  requiredRole: 'user' | 'admin';
  component: LazyExoticComponent<ComponentType>;
}

export const tools: ToolDefinition[] = [
  {
    id: 'dti-connector',
    name: 'DTI Connector',
    description: 'DTI Daten verwalten — Hierarchien, Modelle, Files und Assets.',
    icon: 'Database',
    iconColor: 'text-accent',
    status: 'active',
    requiredRole: 'user',
    component: lazy(() => import('./dti-connector')),
  },
  {
    id: 'aas-editor',
    name: 'AAS Editor',
    description: 'AAS-Dokumente visuell erstellen und bearbeiten.',
    icon: 'Hexagon',
    iconColor: 'text-purple-400',
    status: 'active',
    requiredRole: 'user',
    component: lazy(() => import('./aas-editor')),
  },
  {
    id: 'excel-connector',
    name: 'Excel Connector',
    description: 'Excel-Dateien als Live-Datenquelle für die API.',
    icon: 'FileSpreadsheet',
    iconColor: 'text-emerald-400',
    status: 'active',
    requiredRole: 'user',
    component: lazy(() => import('./excel-connector')),
  },
];

export function getActiveTools() {
  return tools.filter(t => t.status !== 'coming_soon');
}

export function getTool(id: string) {
  return tools.find(t => t.id === id);
}
