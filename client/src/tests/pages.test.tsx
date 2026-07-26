import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginPage } from '../components/pages/LoginPage.js';
import { PortalPage } from '../components/pages/PortalPage.js';
import { ServerStatus, EditorType, EditorMode } from '../types.js';

const baseStatus = {
  status: ServerStatus.Stopped,
  onlinePlayers: 0,
  stats: { cpu: 0, memory: 0, memoryTotal: 0 },
  idleShutdown: { minutes: 0, active: false, remainingSeconds: 0 }
};

describe('Pages Components Tests', () => {
  it('should render LoginPage component', () => {
    render(<LoginPage onLogin={vi.fn()} />);
    expect(screen.getByText(/PZ Server Manager/i)).toBeDefined();
  });

  it('should render PortalPage component and switch tabs', () => {
    render(
      <PortalPage
        status={baseStatus}
        logs={['Log 1']}
        iniSettings={[{ key: 'MaxPlayers', value: '16', description: 'Max' }]}
        panelConfig={{ idleShutdownMinutes: 0, serverLanguage: 'es' }}
        modsList={[{ modId: 'Hydrocraft', workshopId: '12345' }]}
        editorType={EditorType.Ini}
        editorMode={EditorMode.Gui}
        parsedConfigData={[{ key: 'PVP', value: 'true', description: 'PVP' }]}
        rawConfigText=""
        selectedBranch=""
        savedMessage=""
        onLogout={vi.fn()}
        onBranchChange={vi.fn()}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onRestart={vi.fn()}
        onKill={vi.fn()}
        onUpdate={vi.fn()}
        onSendCommand={vi.fn()}
        onIniSettingChange={vi.fn()}
        onPanelConfigChange={vi.fn()}
        onSaveSettings={vi.fn()}
        onAddMod={vi.fn()}
        onRemoveMod={vi.fn()}
        onSaveMods={vi.fn()}
        onEditorTypeChange={vi.fn()}
        onEditorModeChange={vi.fn()}
        onRawTextChange={vi.fn()}
        onUpdateSandboxValue={vi.fn()}
        onToggleSpawnRegion={vi.fn()}
        onRemoveSpawnRegion={vi.fn()}
        onSaveEditor={vi.fn()}
      />
    );

    expect(screen.getByText(/Consola y Control/i)).toBeDefined();

    fireEvent.click(screen.getByText(/Parámetros Principales/i));
    expect(screen.getByText(/Opciones Generales del Servidor y Portal/i)).toBeDefined();

    fireEvent.click(screen.getByText(/Gestión de Mods/i));
    expect(screen.getByText(/Añadir Nuevo Mod de Steam Workshop/i)).toBeDefined();

    fireEvent.click(screen.getByText(/Configuración Avanzada/i));
    expect(screen.getByText(/server.ini/i)).toBeDefined();
  });
});
