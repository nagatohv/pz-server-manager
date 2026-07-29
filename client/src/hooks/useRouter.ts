import { useState, useEffect, useCallback } from 'react';

export type RoutePath = 'console' | 'servers' | 'server-config';
export type ConfigSubTab = 'editor' | 'mods' | 'backups';

export interface RouteState {
  path: RoutePath;
  serverId: string | null;
  configSubTab: ConfigSubTab;
}

const parseHash = (hashStr: string): RouteState => {
  const clean = hashStr.replace(/^#\/?/, '').trim();
  if (!clean || clean.startsWith('console')) {
    return { path: 'console', serverId: null, configSubTab: 'editor' };
  }
  if (clean.startsWith('servers')) {
    const parts = clean.split('/');
    // #/servers/:id/config/:tab or #/servers/:id/config
    if (parts.length >= 3 && parts[2] === 'config') {
      const serverId = parts[1];
      const tabParam = (parts[3] ?? 'editor') as ConfigSubTab;
      const validTab: ConfigSubTab = ['editor', 'mods', 'backups'].includes(tabParam) ? (tabParam as ConfigSubTab) : 'editor';
      return { path: 'server-config', serverId, configSubTab: validTab };
    }
    return { path: 'servers', serverId: null, configSubTab: 'editor' };
  }
  return { path: 'console', serverId: null, configSubTab: 'editor' };
};

export const useRouter = () => {
  const [route, setRoute] = useState<RouteState>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToConsole = useCallback(() => {
    window.location.hash = '#/console';
  }, []);

  const navigateToServers = useCallback(() => {
    window.location.hash = '#/servers';
  }, []);

  const navigateToServerConfig = useCallback((serverId: string, subTab: ConfigSubTab = 'editor') => {
    window.location.hash = `#/servers/${serverId}/config/${subTab}`;
  }, []);

  return {
    route,
    navigateToConsole,
    navigateToServers,
    navigateToServerConfig
  };
};
