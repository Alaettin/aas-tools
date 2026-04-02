import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getActiveTools } from '@/tools/registry';
import {
  Hexagon,
  LayoutDashboard,
  Users,
  Database,
  FileSpreadsheet,
} from 'lucide-react';

const ICON_MAP: Record<string, (cls: string) => React.ReactNode> = {
  Database: (cls) => <Database className={cls} />,
  Hexagon: (cls) => <Hexagon className={cls} strokeWidth={1.5} />,
  FileSpreadsheet: (cls) => <FileSpreadsheet className={cls} />,
};

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

function NavLinkItem({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 h-10 rounded-sm text-sm transition-all relative ${
          isActive
            ? 'bg-accent-muted text-accent font-medium'
            : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-accent rounded-r" />
          )}
          {item.icon}
          <span>{item.label}</span>
          {item.adminOnly && (
            <span className="ml-auto text-2xs font-mono text-txt-muted bg-bg-elevated px-1.5 py-0.5 rounded-sm">
              ADMIN
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

// const mainItems: NavItem[] = [];

const systemItems: NavItem[] = [
  {
    label: 'Benutzer',
    path: '/users',
    icon: <Users className="w-[18px] h-[18px]" />,
    adminOnly: true,
  },
  // {
  //   label: 'Einstellungen',
  //   path: '/settings',
  //   icon: <Settings className="w-[18px] h-[18px]" />,
  // },
];

export function Sidebar() {
  const { isAdmin, toolAccess } = useAuth();
  const activeTools = getActiveTools()
    .filter(tool => isAdmin || toolAccess.includes(tool.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const visibleSystemItems = systemItems.filter(
    item => !item.adminOnly || isAdmin
  );

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-bg-surface border-r border-border flex flex-col z-30">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-border">
        <div className="relative flex-shrink-0">
          <Hexagon className="w-8 h-8 text-accent" strokeWidth={1.5} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[10px] font-bold text-accent">A</span>
          </div>
        </div>
        <div className="min-w-0">
          <span className="font-mono text-sm font-bold tracking-tight block">
            AAS Tools
          </span>
          <span className="text-2xs text-txt-muted font-mono uppercase tracking-widest block">
            Platform
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1 mb-4">
          <NavLinkItem item={{ label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> }} />
        </div>

        {/* Active Tools */}
        {activeTools.length > 0 && (
          <>
            <p className="px-3 mt-6 mb-3 text-2xs font-medium text-txt-muted uppercase tracking-widest">
              Tools
            </p>
            <div className="space-y-1">
              {activeTools.map(tool => {
                const renderIcon = ICON_MAP[tool.icon];
                return (
                  <NavLinkItem
                    key={tool.id}
                    item={{
                      label: tool.name,
                      path: `/tools/${tool.id}`,
                      icon: renderIcon
                        ? renderIcon(`w-[18px] h-[18px] ${tool.iconColor}`)
                        : <Hexagon className={`w-[18px] h-[18px] ${tool.iconColor}`} strokeWidth={1.5} />,
                    }}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* System */}
        <p className="px-3 mt-6 mb-3 text-2xs font-medium text-txt-muted uppercase tracking-widest">
          System
        </p>
        <div className="space-y-1">
          {visibleSystemItems.map(item => (
            <NavLinkItem key={item.path} item={item} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <p className="text-2xs text-txt-muted font-mono">
          v0.1.0
        </p>
      </div>
    </aside>
  );
}
