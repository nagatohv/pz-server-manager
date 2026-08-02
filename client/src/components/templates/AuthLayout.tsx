import React, { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="login-container">
      <div className="login-wrapper">
        {children}
      </div>
    </div>
  );
};

