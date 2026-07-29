import React from 'react';
import { Button } from '../atoms/Button.js';
import { TerminalIcon, SettingsIcon, PuzzleIcon, FileIcon } from '../atoms/Icon.js';
import { CLIENT_STRINGS } from '../../config/strings.js';
import { PortalTab, ButtonVariant } from '../../types.js';

interface NavTabsProps {
  activeTab: PortalTab;
  onTabChange: (tab: PortalTab) => void;
}

interface TabDefinition {
  id: PortalTab;
  label: string;
  icon: React.ReactNode;
}

const TAB_DEFINITIONS: TabDefinition[] = [
  { id: PortalTab.Console, label: CLIENT_STRINGS.NAV_TABS.CONSOLE, icon: <TerminalIcon /> },
  { id: PortalTab.Servers, label: CLIENT_STRINGS.NAV_TABS.SERVERS, icon: <FileIcon /> }
];

export const NavTabs: React.FC<NavTabsProps> = ({ activeTab, onTabChange }) => (
  <nav className="nav-tabs">
    {TAB_DEFINITIONS.map(({ id, label, icon }) => (
      <Button
        key={id}
        variant={ButtonVariant.Nav}
        active={activeTab === id}
        onClick={() => onTabChange(id)}
      >
        {icon} {label}
      </Button>
    ))}
  </nav>
);
