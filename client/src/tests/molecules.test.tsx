import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '../i18n/index.js';
import { StatusWidget } from '../components/molecules/StatusWidget.js';
import { NavTabs } from '../components/molecules/NavTabs.js';
import { ControlBar } from '../components/molecules/ControlBar.js';
import { GuiCard } from '../components/molecules/GuiCard.js';
import { ModCard } from '../components/molecules/ModCard.js';
import { AlertModal } from '../components/molecules/AlertModal.js';
import { ServerStatus, PortalTab } from '../types.js';
import { PLAYERS_WIDGET_COLOR } from '../config/constants.js';

const noop = () => undefined;

describe('Molecules Components Tests', () => {
  it('should render StatusWidget with badges, progress bars and values', () => {
    render(
      <div>
        <StatusWidget title="Status" badge={{ status: ServerStatus.Running, label: 'ONLINE' }} />
        <StatusWidget title="CPU" value="45%" progress={45} />
        <StatusWidget title="Players" value={5} subtitle="Connected players" color={PLAYERS_WIDGET_COLOR} />
      </div>
    );
    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByText('ONLINE')).toBeDefined();
    expect(screen.getByText('45%')).toBeDefined();
    expect(screen.getByText('Connected players')).toBeDefined();
  });

  it('should render AlertModal for info and confirm dialogs', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    const { rerender } = render(
      <AlertModal
        isOpen={true}
        type="info"
        title="Test Title"
        message="Test Message"
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Test Title')).toBeDefined();
    expect(screen.getByText('Test Message')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /entendido/i }));
    expect(handleClose).toHaveBeenCalled();

    rerender(
      <AlertModal
        isOpen={true}
        type="confirm"
        title="Confirm Title"
        message="Are you sure?"
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Confirm Title')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(handleConfirm).toHaveBeenCalled();
  });

  it('should render NavTabs and fire tab change events', () => {
    const handleTabChange = vi.fn();
    render(<NavTabs activeTab={PortalTab.Console} onTabChange={handleTabChange} />);

    fireEvent.click(screen.getByText(/Servidores/i));
    expect(handleTabChange).toHaveBeenCalledWith(PortalTab.Servers);
  });

  it('should render ControlBar and trigger actions', () => {
    const handleStart = vi.fn();
    const handleStop = vi.fn();
    const handleBranchChange = vi.fn();

    render(
      <ControlBar
        status={ServerStatus.Stopped}
        selectedBranch=""
        availableBranches={[
          { name: '', buildId: '12345', timeUpdated: '', description: '', isDefault: true, isUnstable: false },
          { name: 'unstable', buildId: '67890', timeUpdated: '', description: 'Latest unstable', isDefault: false, isUnstable: true },
          { name: 'b42stable', buildId: '67891', timeUpdated: '', description: 'Build 42 stable', isDefault: false, isUnstable: false }
        ]}
        branchesState="ready"
        branchesError={null}
        branchesSource="steam"
        onBranchChange={handleBranchChange}
        onStart={handleStart}
        onStop={handleStop}
        onRestart={vi.fn()}
        onKill={vi.fn()}
        onUpdate={vi.fn()}
        onRefreshBranches={vi.fn()}
        instances={[
          {
            id: 'inst-1',
            game: 'project-zomboid',
            name: 'servertest',
            branch: '',
            installed: true,
            status: 'STOPPED',
            installPath: '',
            dataPath: '',
            gamePort: 16261,
            rconPort: 27015,
            maxPlayers: 16,
            lastError: null,
            createdAt: 1,
            updatedAt: 1,
            lastInstalledAt: null,
            totalUptimeSeconds: 0
          }
        ]}
        activeInstanceId="inst-1"
        onSelectInstance={noop}
      />
    );

    const startBtn = screen.getByText(/iniciar servidor|start server/i);
    fireEvent.click(startBtn);
    expect(handleStart).toHaveBeenCalled();

    const serverSelect = screen.getByRole('combobox', { name: /active server selector|selector de servidor activo/i });
    expect(serverSelect).toBeDefined();
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
