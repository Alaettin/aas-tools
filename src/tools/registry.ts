import { lazy, type LazyExoticComponent, type ComponentType } from 'react';

export type ToolStatus = 'active' | 'beta' | 'coming_soon';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconColor: string;
  category: 'tool' | 'connector' | 'application';
  status: ToolStatus;
  requiredRole: 'user' | 'admin';
  component: LazyExoticComponent<ComponentType>;
}

export const tools: ToolDefinition[] = [
  {
    id: 'dti-connector',
    name: 'SQL Connector',
    description: 'Daten verwalten — Hierarchien, Modelle, Files und Assets.',
    icon: 'Database',
    iconColor: 'text-accent',
    category: 'connector',
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
    category: 'tool',
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
    category: 'connector',
    status: 'active',
    requiredRole: 'user',
    component: lazy(() => import('./excel-connector')),
  },
  {
    id: 'global-connector',
    name: 'Global Connector',
    description: 'Globale Werte als Live-Datenquelle für die API.',
    icon: 'Globe',
    iconColor: 'text-orange-400',
    category: 'connector',
    status: 'active',
    requiredRole: 'user',
    component: lazy(() => import('./global-connector')),
  },
  {
    id: 'use-case-checker',
    name: 'Use Case Checker',
    description: 'AAS gegen definierte Use Cases evaluieren.',
    icon: 'ClipboardCheck',
    iconColor: 'text-sky-400',
    category: 'application',
    status: 'active',
    requiredRole: 'user',
    component: lazy(() => import('./use-case-checker')),
  },
  {
    id: 'iec-61406-qr',
    name: 'IEC 61406 QR',
    description: 'Normkonforme QR-Codes mit ID-Link Dreieck-Marker erzeugen.',
    icon: 'QrCode',
    iconColor: 'text-cyan-400',
    category: 'tool',
    status: 'active',
    requiredRole: 'user',
    component: lazy(() => import('./iec-61406-qr')),
  },
];

export function getActiveTools() {
  return tools.filter(t => t.status !== 'coming_soon');
}

export function getTool(id: string) {
  return tools.find(t => t.id === id);
}
