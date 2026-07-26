import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  BiohazardIcon,
  PlayIcon,
  StopIcon,
  RestartIcon,
  UpdateIcon,
  KillIcon,
  TerminalIcon,
  SettingsIcon,
  PuzzleIcon,
  FileIcon,
  LogoutIcon
} from '../components/atoms/Icon.js';
import { Badge } from '../components/atoms/Badge.js';
import { ProgressBar } from '../components/atoms/ProgressBar.js';
import { Button } from '../components/atoms/Button.js';
import { Input } from '../components/atoms/Input.js';
import { Select } from '../components/atoms/Select.js';
import { ServerStatus, ButtonVariant } from '../types.js';

describe('Atoms Components Tests', () => {
  it('should render all Icon components without errors', () => {
    const { container } = render(
      <div>
        <BiohazardIcon />
        <PlayIcon />
        <StopIcon />
        <RestartIcon />
        <UpdateIcon />
        <KillIcon />
        <TerminalIcon />
        <SettingsIcon />
        <PuzzleIcon />
        <FileIcon />
        <LogoutIcon />
      </div>
    );
    expect(container.querySelectorAll('svg').length).toBe(11);
  });

  it('should render Badge component with proper status and label', () => {
    render(<Badge status={ServerStatus.Running} label="EN LINEA" />);
    expect(screen.getByText('EN LINEA')).toBeDefined();
  });

  it('should render ProgressBar with correct width and background', () => {
    const { container } = render(
      <div>
        <ProgressBar percent={50} />
        <ProgressBar percent={90} />
      </div>
    );
    const fills = container.querySelectorAll('.progress-fill');
    expect(fills.length).toBe(2);
  });

  it('should render Button with various variants and active states', () => {
    render(
      <div>
        <Button variant={ButtonVariant.Primary}>Btn Primary</Button>
        <Button variant={ButtonVariant.Success}>Btn Success</Button>
        <Button variant={ButtonVariant.Warning}>Btn Warning</Button>
        <Button variant={ButtonVariant.Danger}>Btn Danger</Button>
        <Button variant={ButtonVariant.Logout}>Btn Logout</Button>
        <Button variant={ButtonVariant.Control}>Btn Control</Button>
        <Button variant={ButtonVariant.Toggle} active={true}>Btn Toggle Active</Button>
        <Button variant={ButtonVariant.EditorSelect} active={false}>Btn Editor Select</Button>
        <Button variant={ButtonVariant.Nav} active={true}>Btn Nav Active</Button>
      </div>
    );
    expect(screen.getByText('Btn Primary')).toBeDefined();
    expect(screen.getByText('Btn Toggle Active')).toBeDefined();
  });

  it('should render Input and Select components with labels and descriptions', () => {
    render(
      <div>
        <Input label="Username" description="Enter your username" placeholder="User" />
        <Select label="Language" description="Select your language" options={[{ value: 'es', label: 'Spanish' }]} />
      </div>
    );
    expect(screen.getByText('Username')).toBeDefined();
    expect(screen.getByText('Enter your username')).toBeDefined();
    expect(screen.getByText('Language')).toBeDefined();
    expect(screen.getByText('Select your language')).toBeDefined();
    expect(screen.getByText('Spanish')).toBeDefined();
  });
});
