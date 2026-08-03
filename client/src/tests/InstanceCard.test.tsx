import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import '../i18n/index.js';
import { InstanceCard } from '../components/molecules/InstanceCard.js';
import { ButtonVariant, ServerStatus } from '../types.js';
import type { PzInstance } from '../types.js';

const buildInstance = (overrides: Partial<PzInstance> = {}): PzInstance => ({
  id: 'inst-1',
  game: 'project-zomboid',
  name: 'servertest',
  branch: '42.19',
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

const noop = () => {};

describe('InstanceCard molecule', () => {
  it('shows the name, branch, ports, max players and status badge', () => {
    render(
      <InstanceCard
        instance={buildInstance({ branch: '42.19', status: 'STOPPED' })}
        isActive={false}
        activeStatus={ServerStatus.Stopped}
        loading={false}
        onSelect={noop}
        onInstall={noop}
        onStart={noop}
        onStop={noop}
        onDelete={noop}
        onMigrate={noop}
      />
    );
    expect(screen.getByText('servertest')).toBeDefined();
    expect(screen.getByText('42.19')).toBeDefined();
    expect(screen.getByText('16261')).toBeDefined();
    expect(screen.getByText('27015')).toBeDefined();
    expect(screen.getByText('16')).toBeDefined();
  });

  it('renders the running status badge when this instance is running', () => {
    render(
      <InstanceCard
        instance={buildInstance()}
        isActive
        activeStatus={ServerStatus.Running}
        loading={false}
        onSelect={noop}
        onInstall={noop}
        onStart={noop}
        onStop={noop}
        onDelete={noop}
        onMigrate={noop}
      />
    );
    expect(screen.getByText(/ejecutándose|en línea|online/i)).toBeDefined();
  });

  it('renders the installed badge when the instance has been installed', () => {
    render(
      <InstanceCard
        instance={buildInstance({ installed: true })}
        isActive={false}
        activeStatus={ServerStatus.Stopped}
        loading={false}
        onSelect={noop}
        onInstall={noop}
        onStart={noop}
        onStop={noop}
        onDelete={noop}
        onMigrate={noop}
      />
    );
    expect(screen.getByText(/instalado|installed/i)).toBeDefined();
  });

  it('renders the not-installed badge when the instance has not been installed', () => {
    render(
      <InstanceCard
        instance={buildInstance({ installed: false })}
        isActive={false}
        activeStatus={ServerStatus.Stopped}
        loading={false}
        onSelect={noop}
        onInstall={noop}
        onStart={noop}
        onStop={noop}
        onDelete={noop}
        onMigrate={noop}
      />
    );
    expect(screen.getByText(/sin instalar|not installed/i)).toBeDefined();
  });

  it('shows the empty branch label when branch is the default', () => {
    render(
      <InstanceCard
        instance={buildInstance({ branch: '' })}
        isActive={false}
        activeStatus={ServerStatus.Stopped}
        loading={false}
        onSelect={noop}
        onInstall={noop}
        onStart={noop}
        onStop={noop}
        onDelete={noop}
        onMigrate={noop}
      />
    );
    expect(screen.getByText(/public|p[úu]blica/i)).toBeDefined();
  });

  it('invokes onInstall when the update button is clicked', () => {
    const onInstall = vi.fn();
    const { container } = render(
      <InstanceCard
        instance={buildInstance({ id: 'x' })}
        isActive={false}
        activeStatus={ServerStatus.Stopped}
        loading={false}
        onSelect={noop}
        onInstall={onInstall}
        onStart={noop}
        onStop={noop}
        onDelete={noop}
        onMigrate={noop}
      />
    );
    fireEvent.click(container.querySelector('[data-action="install"]') as HTMLElement);
    expect(onInstall).toHaveBeenCalledWith('x');
  });

  it('invokes onStart when the start button is clicked and is active', () => {
    const onStart = vi.fn();
    const { container } = render(
      <InstanceCard
        instance={buildInstance({ id: 'x' })}
        isActive={true}
        activeStatus={ServerStatus.Stopped}
        loading={false}
        onSelect={noop}
        onInstall={noop}
        onStart={onStart}
        onStop={noop}
        onDelete={noop}
        onMigrate={noop}
      />
    );
    fireEvent.click(container.querySelector('[data-action="start-instance"]') as HTMLElement);
    expect(onStart).toHaveBeenCalled();
  });

  it('invokes onSelect and onStart when the start button is clicked and is not active', async () => {
    const onSelect = vi.fn().mockResolvedValue({});
    const onStart = vi.fn();
    const { container } = render(
      <InstanceCard
        instance={buildInstance({ id: 'x' })}
        isActive={false}
        activeStatus={ServerStatus.Stopped}
        loading={false}
        onSelect={onSelect}
        onInstall={noop}
        onStart={onStart}
        onStop={noop}
        onDelete={noop}
        onMigrate={noop}
      />
    );
    fireEvent.click(container.querySelector('[data-action="start-instance"]') as HTMLElement);
    // onSelect is called immediately, onStart after onSelect finishes
    expect(onSelect).toHaveBeenCalledWith('x');
    // since the click handler resolves asynchronously when calling onSelect,
    // we use a brief delay or microtask flush to verify onStart
    await new Promise((r) => setTimeout(r, 0));
    expect(onStart).toHaveBeenCalled();
  });

  it('invokes onDelete when the delete button is clicked', () => {
    const onDelete = vi.fn();
    const { container } = render(
      <InstanceCard
        instance={buildInstance({ id: 'x' })}
        isActive={false}
        activeStatus={ServerStatus.Stopped}
        loading={false}
        onSelect={noop}
        onInstall={noop}
        onStart={noop}
        onStop={noop}
        onDelete={onDelete}
        onMigrate={noop}
      />
    );
    fireEvent.click(container.querySelector('[data-action="delete"]') as HTMLElement);
    expect(onDelete).toHaveBeenCalledWith('x', 'servertest');
  });

  it('renders and invokes stop button when instance is active and running', () => {
    const onStop = vi.fn();
    const { container } = render(
      <InstanceCard
        instance={buildInstance({ id: 'x' })}
        isActive
        activeStatus={ServerStatus.Running}
        loading={false}
        onSelect={noop}
        onInstall={noop}
        onStart={noop}
        onStop={onStop}
        onDelete={noop}
        onMigrate={noop}
      />
    );
    const stopBtn = container.querySelector('[data-action="stop-instance"]') as HTMLButtonElement;
    expect(stopBtn).toBeDefined();
    fireEvent.click(stopBtn);
    expect(onStop).toHaveBeenCalled();
  });

  it('exposes the variant it uses for primary action', () => {
    expect(ButtonVariant.Success).toBeDefined();
    expect(ButtonVariant.Danger).toBeDefined();
    expect(ButtonVariant.Control).toBeDefined();
  });
});
