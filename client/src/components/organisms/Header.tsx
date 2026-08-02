import './Header.scss';
import React from 'react';
import { BiohazardIcon, LogoutIcon } from '../atoms/Icon.js';
import { Button } from '../atoms/Button.js';
import { CLIENT_STRINGS } from '../../config/strings.js';
import { ButtonVariant } from '../../types.js';

interface HeaderProps {
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  return (
    <header className="portal-header portal-header--spaced">
      <div className="header-top">
        <div className="header-brand">
          <BiohazardIcon />
          <div>
            <h1>{CLIENT_STRINGS.TITLE}</h1>
            <span className="brand-sub">{CLIENT_STRINGS.SUBTITLE}</span>
          </div>
        </div>

        <Button variant={ButtonVariant.Logout} onClick={onLogout}>
          <LogoutIcon /> {CLIENT_STRINGS.AUTH.LOGOUT_BTN}
        </Button>
      </div>
    </header>
  );
};
