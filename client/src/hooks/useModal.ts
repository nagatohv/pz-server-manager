import { useState, useCallback } from 'react';
import type { AlertModalType } from '../components/molecules/AlertModal.js';

export interface ModalOptions {
  type?: AlertModalType;
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface UseModalReturn {
  isOpen: boolean;
  type: AlertModalType;
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  showAlert: (options: ModalOptions | string) => void;
  showConfirm: (options: { title?: string; message: React.ReactNode; confirmText?: string; cancelText?: string; onConfirm: () => void }) => void;
  closeModal: () => void;
}

export function useModal(): UseModalReturn {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: AlertModalType;
    title?: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    message: ''
  });

  const showAlert = useCallback((options: ModalOptions | string) => {
    if (typeof options === 'string') {
      setModalState({
        isOpen: true,
        type: 'info',
        message: options
      });
    } else {
      setModalState({
        isOpen: true,
        type: options.type ?? 'info',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        onConfirm: options.onConfirm,
        onCancel: options.onCancel
      });
    }
  }, []);

  const showConfirm = useCallback((options: { title?: string; message: React.ReactNode; confirmText?: string; cancelText?: string; onConfirm: () => void }) => {
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      onConfirm: options.onConfirm
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    ...modalState,
    showAlert,
    showConfirm,
    closeModal
  };
}
