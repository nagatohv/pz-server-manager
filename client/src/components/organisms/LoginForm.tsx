import React, { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { BiohazardIcon } from '../atoms/Icon.js';
import { Input } from '../atoms/Input.js';
import { Button } from '../atoms/Button.js';
import { ENV } from '../../config/env.js';
import { ButtonVariant } from '../../types.js';

interface LoginFormProps {
  onLogin: (password: string) => Promise<void>;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.errorFailed');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = loading
    ? t('auth.loggingIn')
    : t('auth.loginBtn');

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <BiohazardIcon />
          <h2>{ENV.APP_NAME}</h2>
          <p>{t('auth.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-danger">{error}</div>}

          <Input
            type="password"
            placeholder={t('auth.placeholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoFocus
          />

          <Button type="submit" variant={ButtonVariant.Primary} disabled={loading} className="login-form__submit">
            {buttonLabel}
          </Button>
        </form>
      </div>
    </div>
  );
};
