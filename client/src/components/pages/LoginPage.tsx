import React from 'react';
import { LoginForm } from '../organisms/LoginForm.js';

interface LoginPageProps {
  onLogin: (password: string) => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  return <LoginForm onLogin={onLogin} />;
};
