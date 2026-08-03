import React, { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ModCard } from '../molecules/ModCard.js';
import { Button } from '../atoms/Button.js';
import { Input } from '../atoms/Input.js';
import { ModItem, ButtonVariant } from '../../types.js';

interface ModsPanelProps {
  modsList: ModItem[];
  onAddMod: (modId: string, workshopId: string) => void;
  onRemoveMod: (index: number) => void;
  onSaveMods: () => void;
  savedMessage: string;
}

export const ModsPanel: React.FC<ModsPanelProps> = ({
  modsList,
  onAddMod,
  onRemoveMod,
  onSaveMods,
  savedMessage
}) => {
  const { t } = useTranslation();
  const [newModId, setNewModId] = useState('');
  const [newWorkshopId, setNewWorkshopId] = useState('');

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const trimmedMod = newModId.trim();
    const trimmedWorkshop = newWorkshopId.trim();
    if (!trimmedMod || !trimmedWorkshop) return;
    onAddMod(trimmedMod, trimmedWorkshop);
    setNewModId('');
    setNewWorkshopId('');
  };

  return (
    <div className="tab-content">
      {savedMessage && <div className="alert alert-success">{savedMessage}</div>}

      <div className="card-section">
        <h3>{t('mods.addTitle')}</h3>
        <form onSubmit={handleAdd} className="mod-add-form">
          <Input
            label={t('mods.modIdLabel')}
            placeholder={t('mods.modIdPlaceholder')}
            value={newModId}
            onChange={(e) => setNewModId(e.target.value)}
          />
          <Input
            label={t('mods.workshopIdLabel')}
            placeholder={t('mods.workshopIdPlaceholder')}
            value={newWorkshopId}
            onChange={(e) => setNewWorkshopId(e.target.value)}
          />
          <Button type="submit" variant={ButtonVariant.Primary} className="mod-add-form__submit">
            {t('mods.addBtn')}
          </Button>
        </form>
      </div>

      <div className="card-section card-section--top-margin">
        <h3>{t('mods.listTitle')} ({modsList.length})</h3>
        {modsList.length === 0 ? (
          <p className="empty-text">{t('mods.empty')}</p>
        ) : (
          <div className="mods-grid">
            {modsList.map((mod, idx) => (
              <ModCard
                key={idx}
                modId={mod.modId}
                workshopId={mod.workshopId}
                onRemove={() => onRemoveMod(idx)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="form-actions form-actions--top-margin">
        <Button variant={ButtonVariant.Primary} onClick={onSaveMods}>
          {t('mods.saveBtn')}
        </Button>
      </div>
    </div>
  );
};
