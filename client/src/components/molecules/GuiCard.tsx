import React from 'react';
import { useTranslation } from 'react-i18next';
import { BoundedOptionMeta } from '../../types.js';

interface GuiCardProps {
  itemKey: string;
  value: unknown;
  onChange: (newVal: unknown) => void;
  description: string;
  boundedOption?: BoundedOptionMeta;
}

const isBooleanValue = (value: unknown): boolean =>
  typeof value === 'boolean' || value === 'true' || value === 'false';

const toBooleanValue = (value: unknown): boolean =>
  value === true || value === 'true';

export const GuiCard: React.FC<GuiCardProps> = ({
  itemKey,
  value,
  onChange,
  description,
  boundedOption
}) => {
  const { t } = useTranslation();

  const renderField = (): React.ReactNode => {
    if (isBooleanValue(value)) {
      const boolVal = toBooleanValue(value);
      return (
        <select
          className="form-control"
          value={boolVal ? 'true' : 'false'}
          onChange={(e) => onChange(e.target.value === 'true')}
          aria-label={itemKey}
        >
          <option value="true">{t('editor.booleanTrue')}</option>
          <option value="false">{t('editor.booleanFalse')}</option>
        </select>
      );
    }

    if (boundedOption?.options) {
      return (
        <select
          className="form-control"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          aria-label={itemKey}
        >
          {boundedOption.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    const isNumeric = typeof value === 'number' ||
      (boundedOption && (boundedOption.min !== undefined || boundedOption.max !== undefined));

    if (isNumeric) {
      return (
        <input
          type="number"
          className="form-control"
          min={boundedOption?.min}
          max={boundedOption?.max}
          value={String(value)}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          aria-label={itemKey}
        />
      );
    }

    return (
      <input
        type="text"
        className="form-control"
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        aria-label={itemKey}
      />
    );
  };

  return (
    <div className="gui-card">
      <div className="gui-card-header">
        <span className="gui-card-key">{itemKey}</span>
      </div>
      <div className="gui-card-body">{renderField()}</div>
      {description && (
        <div className="gui-card-footer">
          <span className="gui-card-desc">{description}</span>
        </div>
      )}
    </div>
  );
};
