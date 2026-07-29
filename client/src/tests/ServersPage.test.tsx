import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ServersPage } from '../components/pages/ServersPage.js';
import { ServerStatus, type InstanceRegistry, type PzInstance } from '../types.js';

const buildInstance = (overrides: Partial<PzInstance> = {}): PzInstance => ({
  id: 'inst-1',
  name: 'servertest',
  branch: '',
  installed: true,
  status: 'STOPPED',
  installPath: '/data/instances/inst-1/pzserver',
  dataPath: '/data/instances/inst-1/Zomboid',
  gamePort: 16261,
  rconPort: 27015,
  maxPlayers: 16,
  lastError: null,
  createdAt: 1,
  updatedAt: 1,
  lastInstalledAt: 1,
  ...overrides
});

interface Harness {
  registry: InstanceRegistry;
  loading: boolean;
  error: string | null;
  refresh: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  install: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  migrate: ReturnType<typeof vi.fn>;
}

const sampleBranches = [
  { name: '', buildId: '22695654', timeUpdated: '', description: 'Rama pública', isDefault: true, isUnstable: false },
  { name: '42.19', buildId: '23504635', timeUpdated: '', description: 'Build 42.19', isDefault: false, isUnstable: false }
];

const buildHarness = (overrides: Partial<Harness> = {}): Harness => ({
  registry: { instances: [], activeInstanceId: null, updatedAt: 0 },
  loading: false,
  error: null,
  refresh: vi.fn().mockResolvedValue(undefined),
  create: vi.fn().mockImplementation(async (input) => ({
    id: 'new-id', name: input.name, branch: input.branch, installed: false,
    status: 'STOPPED', installPath: '', dataPath: '',
    gamePort: input.gamePort, rconPort: input.rconPort, maxPlayers: input.maxPlayers,
    lastError: null, createdAt: 1, updatedAt: 1, lastInstalledAt: null
  })),
  select: vi.fn().mockResolvedValue(buildInstance()),
  install: vi.fn().mockResolvedValue({ instance: buildInstance(), success: true }),
  remove: vi.fn().mockResolvedValue(undefined),
  migrate: vi.fn().mockResolvedValue({ sourceId: 'a', targetId: 'b', filesCopied: 1, bytesCopied: 10 }),
  ...overrides
});

const noop = () => undefined;

describe('ServersPage', () => {
  beforeEach(() => {
    (window as { confirm?: () => boolean }).confirm = () => true;
  });

  it('shows the empty state when no instances exist', () => {
    const harness = buildHarness();
    render(<ServersPage harness={harness as any} branches={sampleBranches} branchesSource="steam" activeStatus={ServerStatus.Stopped} onStart={noop} onStop={noop} />);
    expect(screen.getByText(/no hay servidores/i)).toBeDefined();
  });

  it('renders the instance list with the active badge', () => {
    const harness = buildHarness({
      registry: {
        instances: [buildInstance({ id: 'a', name: 'srv-a' })],
        activeInstanceId: 'a',
        updatedAt: 0
      }
    });
    render(<ServersPage harness={harness as any} branches={sampleBranches} branchesSource="steam" activeStatus={ServerStatus.Running} onStart={noop} onStop={noop} />);
    expect(screen.getByText('srv-a')).toBeDefined();
    expect(screen.getByText(/ejecutándose/i)).toBeDefined();
  });

  it('opens the create dialog and submits the form', async () => {
    const harness = buildHarness();
    const { container } = render(<ServersPage harness={harness as any} branches={sampleBranches} branchesSource="steam" activeStatus={ServerStatus.Stopped} onStart={noop} onStop={noop} />);
    const openBtn = container.querySelector('[data-action="create-instance"]') as HTMLButtonElement;
    fireEvent.click(openBtn);

    const nameInput = screen.getByLabelText(/nombre del servidor/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'srv-new' } });

    const submitBtn = container.querySelector('[data-action="submit-create"]') as HTMLButtonElement;
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(harness.create).toHaveBeenCalled();
    });
  });

  it('triggers install/update when the install button is clicked', async () => {
    const harness = buildHarness({
      registry: {
        instances: [buildInstance({ id: 'a', name: 'srv-a', installed: false })],
        activeInstanceId: null,
        updatedAt: 0
      }
    });
    render(<ServersPage harness={harness as any} branches={sampleBranches} branchesSource="steam" activeStatus={ServerStatus.Stopped} onStart={noop} onStop={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /instalar \/ actualizar/i }));
    await waitFor(() => {
      expect(harness.install).toHaveBeenCalledWith('a');
    });
  });

  it('triggers delete after confirmation', async () => {
    const harness = buildHarness({
      registry: {
        instances: [buildInstance({ id: 'a', name: 'srv-a' })],
        activeInstanceId: null,
        updatedAt: 0
      }
    });
    const { container } = render(<ServersPage harness={harness as any} branches={sampleBranches} branchesSource="steam" activeStatus={ServerStatus.Stopped} onStart={noop} onStop={noop} />);
    fireEvent.click(container.querySelector('[data-action="delete"]') as HTMLElement);
    fireEvent.click(container.querySelector('[data-action="alert-confirm"]') as HTMLElement);
    await waitFor(() => {
      expect(harness.remove).toHaveBeenCalledWith('a');
    });
  });

  it('triggers select and start when the start button is clicked on an inactive instance', async () => {
    const harness = buildHarness({
      registry: {
        instances: [buildInstance({ id: 'a', name: 'srv-a' })],
        activeInstanceId: null,
        updatedAt: 0
      }
    });
    render(<ServersPage harness={harness as any} branches={sampleBranches} branchesSource="steam" activeStatus={ServerStatus.Stopped} onStart={noop} onStop={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /iniciar servidor/i }));
    await waitFor(() => {
      expect(harness.select).toHaveBeenCalledWith('a');
    });
  });
});
