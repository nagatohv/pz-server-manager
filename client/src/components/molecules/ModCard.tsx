import React from 'react';
import { useTranslation } from 'react-i18next';

interface ModCardProps {
  modId: string;
  workshopId: string;
  onRemove: () => void;
}

export const ModCard: React.FC<ModCardProps> = ({ modId, workshopId, onRemove }) => {
  const { t } = useTranslation();
  return (
    <div className="mod-card">
      <div className="mod-card-info">
        <span className="mod-title">{modId}</span>
        <span className="mod-sub">{t('mods.workshopIdText', { id: workshopId })}</span>
      </div>
      <button className="btn btn-danger btn-sm" onClick={onRemove}>
        {t('mods.removeBtn')}
      </button>
    </div>
  );
};
