import React from 'react';
import './ProgressBar.scss';
import { PROGRESS_HIGH_THRESHOLD, PROGRESS_COLOR_HIGH, PROGRESS_COLOR_NORMAL } from '../../config/constants.js';

interface ProgressBarProps {
  percent: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percent }) => {
  const background = percent > PROGRESS_HIGH_THRESHOLD ? PROGRESS_COLOR_HIGH : PROGRESS_COLOR_NORMAL;

  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${percent}%`, background }} />
    </div>
  );
};
