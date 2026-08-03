import './AlertModal.scss';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button.js';
import { ButtonVariant } from '../../types.js';

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

const ICON_BY_TYPE: Record<AlertModalType, string> = {
  info: 'ℹ️',
  error: '⚠️',
  success: '✅',
  confirm: '❓'
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
  const { t } = useTranslation();
  if (!isOpen) return null;

  const defaultTitles: Record<AlertModalType, string> = {
    info: t('modal.alertTitle'),
    error: t('modal.errorTitle'),
    success: t('modal.successTitle'),
    confirm: t('modal.confirmTitle')
  };

  const resolvedTitle = title ?? defaultTitles[type];
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
          <span className="alert-modal__icon" aria-hidden="true">{ICON_BY_TYPE[type]}</span>
          <h3 className="alert-modal__title">{resolvedTitle}</h3>
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
                {cancelText || t('modal.cancelBtn')}
              </Button>
              <Button
                type="button"
                variant={ButtonVariant.Danger}
                onClick={handleConfirm}
                data-action="alert-confirm"
              >
                {confirmText || t('modal.confirmBtn')}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant={ButtonVariant.Primary}
              onClick={handleConfirm}
              data-action="alert-accept"
            >
              {confirmText || t('modal.acceptBtn')}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
};
