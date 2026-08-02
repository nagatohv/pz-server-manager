import React from 'react';
import { AuthLayout } from '../templates/index.js';
import { LoginForm } from '../organisms/index.js';

interface LoginPageProps {
  onLogin: (password: string) => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  return (
    <AuthLayout>
      <LoginForm onLogin={onLogin} />
    </AuthLayout>
  );
};
