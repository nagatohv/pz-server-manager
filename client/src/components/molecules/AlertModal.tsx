import './AlertModal.scss';
import React from 'react';
import { Button } from '../atoms/Button.js';
import { ButtonVariant } from '../../types.js';
import { CLIENT_STRINGS } from '../../config/strings.js';

export type AlertModalType = 'info' | 'error' | 'success' | 'confirm';

export interface AlertModalProps {
  isOpen: boolean;
  type?: AlertModalType;
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose: () => void;
}

const getModalHeader = (type: AlertModalType = 'info', title?: string): { title: string; icon: string } => {
  if (title) {
    const icon = type === 'error' ? '⚠️' : type === 'success' ? '✅' : type === 'confirm' ? '❓' : 'ℹ️';
    return { title, icon };
  }
  switch (type) {
    case 'error':
      return { title: CLIENT_STRINGS.MODAL.ERROR_TITLE, icon: '⚠️' };
    case 'success':
      return { title: CLIENT_STRINGS.MODAL.SUCCESS_TITLE, icon: '✅' };
    case 'confirm':
      return { title: CLIENT_STRINGS.MODAL.CONFIRM_TITLE, icon: '❓' };
    case 'info':
    default:
      return { title: CLIENT_STRINGS.MODAL.ALERT_TITLE, icon: 'ℹ️' };
  }
};

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  type = 'info',
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  onClose
}) => {
  if (!isOpen) return null;

  const header = getModalHeader(type, title);
  const isConfirm = type === 'confirm';

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <div
      className="modal-backdrop alert-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      data-component="alert-modal"
    >
      <div className={`modal alert-modal alert-modal--${type}`}>
        <header className="alert-modal__header">
          <span className="alert-modal__icon" aria-hidden="true">{header.icon}</span>
          <h3 className="alert-modal__title">{header.title}</h3>
        </header>

        <div className="alert-modal__content">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>

        <footer className="alert-modal__actions">
          {isConfirm ? (
            <>
              <Button
                type="button"
                variant={ButtonVariant.Control}
                onClick={handleCancel}
                data-action="alert-cancel"
              >
                {cancelText || CLIENT_STRINGS.MODAL.CANCEL_BTN}
              </Button>
              <Button
                type="button"
                variant={ButtonVariant.Danger}
                onClick={handleConfirm}
                data-action="alert-confirm"
              >
                {confirmText || CLIENT_STRINGS.MODAL.CONFIRM_BTN}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant={ButtonVariant.Primary}
              onClick={handleConfirm}
              data-action="alert-accept"
            >
              {confirmText || CLIENT_STRINGS.MODAL.ACCEPT_BTN}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
};
