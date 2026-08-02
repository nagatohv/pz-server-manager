import { useState, useEffect, useCallback } from 'react';

export type RoutePath = 'servers' | 'server-config';
export type ConfigSubTab = 'console' | 'editor' | 'mods' | 'backups';

export interface RouteState {
  path: RoutePath;
  serverId: string | null;
  configSubTab: ConfigSubTab;
}

const parseHash = (hashStr: string): RouteState => {
  const clean = hashStr.replace(/^#\/?/, '').trim();
  if (clean.startsWith('servers')) {
    const parts = clean.split('/');
    if (parts.length >= 3 && parts[2] === 'config') {
      const serverId = parts[1];
      const tabParam = (parts[3] ?? 'console') as ConfigSubTab;
      const validTab: ConfigSubTab = ['console', 'editor', 'mods', 'backups'].includes(tabParam) ? (tabParam as ConfigSubTab) : 'console';
      return { path: 'server-config', serverId, configSubTab: validTab };
    }
    return { path: 'servers', serverId: null, configSubTab: 'console' };
  }
  // Default fallback is list of servers
  return { path: 'servers', serverId: null, configSubTab: 'console' };
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

  const navigateToServers = useCallback(() => {
    window.location.hash = '#/servers';
  }, []);

  const navigateToServerConfig = useCallback((serverId: string, subTab: ConfigSubTab = 'console') => {
    window.location.hash = `#/servers/${serverId}/config/${subTab}`;
  }, []);

  return {
    route,
    navigateToServers,
    navigateToServerConfig
  };
};
