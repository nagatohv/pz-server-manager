import React from 'react';

interface ModCardProps {
  modId: string;
  workshopId: string;
  onRemove: () => void;
}

export const ModCard: React.FC<ModCardProps> = ({ modId, workshopId, onRemove }) => {
  return (
    <div className="mod-card">
      <div className="mod-card-info">
        <span className="mod-title">{modId}</span>
        <span className="mod-sub">Workshop ID: {workshopId}</span>
      </div>
      <button className="btn btn-danger btn-sm" onClick={onRemove}>
        Eliminar
      </button>
    </div>
  );
};
