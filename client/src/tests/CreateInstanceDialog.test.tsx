import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import '../i18n/index.js';
import { CreateInstanceDialog } from '../components/organisms/CreateInstanceDialog.js';
import type { BranchInfo } from '../types.js';

const buildBranch = (overrides: Partial<BranchInfo> = {}): BranchInfo => ({
  name: '',
  buildId: '22695654',
  timeUpdated: '1775656121',
  description: 'Rama Pública (Build 41)',
  isDefault: true,
  isUnstable: false,
  ...overrides
});

const sampleBranches: BranchInfo[] = [
  buildBranch(),
  buildBranch({ name: '42.19', buildId: '23504635', description: 'Build 42.19', isDefault: false, isUnstable: false }),
  buildBranch({ name: 'unstable', buildId: '23504635', description: 'unstable', isDefault: false, isUnstable: true }),
  buildBranch({ name: 'legacy41', buildId: '22695654', description: 'Build 41.78.19', isDefault: false, isUnstable: false })
];

describe('CreateInstanceDialog organism', () => {
  it('renders a Select atom populated with the discovered branches', () => {
    const { container } = render(
      <CreateInstanceDialog
        branches={sampleBranches}
        branchesSource="steam"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    const select = container.querySelector('select[name="branch"]') as HTMLSelectElement;
    expect(select).toBeTruthy();
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual(['', '42.19', 'unstable', 'legacy41']);
  });

  it('shows the empty option for the default branch with its real buildId', () => {
    const { container } = render(
      <CreateInstanceDialog
        branches={sampleBranches}
        branchesSource="steam"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    const select = container.querySelector('select[name="branch"]') as HTMLSelectElement;
    const defaultOption = select.options[0];
    expect(defaultOption.value).toBe('');
    expect(defaultOption.textContent).toMatch(/p[úu]blica.*Build 22695654/i);
  });

  it('shows error state and retry button when branches cannot be retrieved from Steam', () => {
    const handleRetry = vi.fn();
    render(
      <CreateInstanceDialog
        branches={[]}
        branchesSource="fallback"
        branchesState="error"
        branchesError="Error de red con Steam"
        onRefreshBranches={handleRetry}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText(/Error de red con Steam/i)).toBeDefined();
    const retryBtn = screen.getByRole('button', { name: /reintentar/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('includes the buildId in the option label so the user can see the real Steam version', () => {
    const { container } = render(
      <CreateInstanceDialog
        branches={sampleBranches}
        branchesSource="steam"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    const select = container.querySelector('select[name="branch"]') as HTMLSelectElement;
    const b42Option = Array.from(select.options).find((o) => o.value === '42.19');
    expect(b42Option?.textContent).toMatch(/23504635/);
  });

  it('invokes onSubmit with the form data when submitted', () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <CreateInstanceDialog
        branches={sampleBranches}
        branchesSource="steam"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />
    );
    const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'srv-x' } });

    const gamePortInput = container.querySelector('input[name="gamePort"]') as HTMLInputElement;
    fireEvent.change(gamePortInput, { target: { value: '17000' } });

    const rconPortInput = container.querySelector('input[name="rconPort"]') as HTMLInputElement;
    fireEvent.change(rconPortInput, { target: { value: '28000' } });

    const maxPlayersInput = container.querySelector('input[name="maxPlayers"]') as HTMLInputElement;
    fireEvent.change(maxPlayersInput, { target: { value: '24' } });

    const branchSelect = container.querySelector('select[name="branch"]') as HTMLSelectElement;
    fireEvent.change(branchSelect, { target: { value: '42.19' } });

    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'srv-x',
      branch: '42.19',
      gamePort: 17000,
      rconPort: 28000,
      maxPlayers: 24
    }));
  });
});
