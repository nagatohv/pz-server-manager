import React, { useState, FormEvent } from 'react';
import { BiohazardIcon } from '../atoms/Icon.js';
import { Input } from '../atoms/Input.js';
import { Button } from '../atoms/Button.js';
import { CLIENT_STRINGS } from '../../config/strings.js';
import { ButtonVariant } from '../../types.js';

interface LoginFormProps {
  onLogin: (password: string) => Promise<void>;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
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
      const message = err instanceof Error ? err.message : CLIENT_STRINGS.AUTH.ERR_AUTH_FAILED;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = loading
    ? CLIENT_STRINGS.AUTH.LOADING_TEXT
    : CLIENT_STRINGS.AUTH.LOGIN_BTN;

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <BiohazardIcon />
          <h2>{CLIENT_STRINGS.TITLE}</h2>
          <p>{CLIENT_STRINGS.AUTH.SUBTITLE}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-danger">{error}</div>}

          <Input
            type="password"
            placeholder={CLIENT_STRINGS.AUTH.PASSWORD_PLACEHOLDER}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />

          <Button
            type="submit"
            variant={ButtonVariant.Primary}
            className="login-form__submit"
            disabled={loading}
          >
            {buttonLabel}
          </Button>
        </form>
      </div>
    </div>
  );
};
