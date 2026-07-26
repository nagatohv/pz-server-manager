import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusWidget } from '../components/molecules/StatusWidget.js';
import { NavTabs } from '../components/molecules/NavTabs.js';
import { ControlBar } from '../components/molecules/ControlBar.js';
import { GuiCard } from '../components/molecules/GuiCard.js';
import { ModCard } from '../components/molecules/ModCard.js';
import { ServerStatus, PortalTab } from '../types.js';

describe('Molecules Components Tests', () => {
  it('should render StatusWidget with badges, progress bars and values', () => {
    render(
      <div>
        <StatusWidget title="Status" badge={{ status: ServerStatus.Running, label: 'ONLINE' }} />
        <StatusWidget title="CPU" value="45%" progress={45} />
        <StatusWidget title="Players" value={5} subtitle="Connected players" color="#38bdf8" />
      </div>
    );
    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByText('ONLINE')).toBeDefined();
    expect(screen.getByText('45%')).toBeDefined();
    expect(screen.getByText('Connected players')).toBeDefined();
  });

  it('should render NavTabs and fire tab change events', () => {
    const handleTabChange = vi.fn();
    render(<NavTabs activeTab={PortalTab.Console} onTabChange={handleTabChange} />);

    fireEvent.click(screen.getByText(/Parámetros Principales/i));
    expect(handleTabChange).toHaveBeenCalledWith(PortalTab.Settings);
  });

  it('should render ControlBar and trigger actions', () => {
    const handleStart = vi.fn();
    const handleStop = vi.fn();
    const handleBranchChange = vi.fn();

    render(
      <ControlBar
        status={ServerStatus.Stopped}
        selectedBranch=""
        onBranchChange={handleBranchChange}
        onStart={handleStart}
        onStop={handleStop}
        onRestart={vi.fn()}
        onKill={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    const startBtn = screen.getByText(/Iniciar Servidor/i);
    fireEvent.click(startBtn);
    expect(handleStart).toHaveBeenCalled();

    const selectEl = screen.getByRole('combobox');
    fireEvent.change(selectEl, { target: { value: 'unstable' } });
    expect(handleBranchChange).toHaveBeenCalledWith('unstable');
  });

  it('should render GuiCard for boolean, select, number and text fields', () => {
    const handleChange = vi.fn();
    render(
      <div>
        <GuiCard itemKey="BoolField" value={true} onChange={handleChange} description="Bool desc" />
        <GuiCard itemKey="SelectField" value="opt1" onChange={handleChange} description="Select desc" boundedOption={{ options: [{ value: 'opt1', label: 'Option 1' }] }} />
        <GuiCard itemKey="NumField" value={10} onChange={handleChange} description="Num desc" boundedOption={{ min: 0, max: 100 }} />
        <GuiCard itemKey="TextField" value="hello" onChange={handleChange} description="Text desc" />
      </div>
    );

    expect(screen.getByText('BoolField')).toBeDefined();
    expect(screen.getByText('Bool desc')).toBeDefined();
    expect(screen.getByText('Option 1')).toBeDefined();
    expect(screen.getByText('NumField')).toBeDefined();
    expect(screen.getByText('TextField')).toBeDefined();
  });

  it('should render ModCard and trigger remove action', () => {
    const handleRemove = vi.fn();
    render(<ModCard modId="Hydrocraft" workshopId="514493422" onRemove={handleRemove} />);

    expect(screen.getByText('Hydrocraft')).toBeDefined();
    expect(screen.getByText('Workshop ID: 514493422')).toBeDefined();

    fireEvent.click(screen.getByText(/Eliminar/i));
    expect(handleRemove).toHaveBeenCalled();
  });
});
