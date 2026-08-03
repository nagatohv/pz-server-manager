import './NavTabs.scss';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button.js';
import { TerminalIcon, FileIcon } from '../atoms/Icon.js';
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

export const NavTabs: React.FC<NavTabsProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();

  const tabDefinitions: TabDefinition[] = [
    { id: PortalTab.Console, label: t('nav.console'), icon: <TerminalIcon /> },
    { id: PortalTab.Servers, label: t('nav.servers'), icon: <FileIcon /> }
  ];

  return (
    <nav className="nav-tabs">
      {tabDefinitions.map(({ id, label, icon }) => (
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
};
