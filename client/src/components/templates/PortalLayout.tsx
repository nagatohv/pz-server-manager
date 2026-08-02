import React, { ReactNode } from 'react';

interface PortalLayoutProps {
  header: ReactNode;
  navTabs?: ReactNode;
  children: ReactNode;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ header, navTabs, children }) => {
  return (
    <div className="portal-container">
      {header}
      <main className="portal-main">
        {navTabs}
        <div className="tab-body">
          {children}
        </div>
      </main>
    </div>
  );
};

