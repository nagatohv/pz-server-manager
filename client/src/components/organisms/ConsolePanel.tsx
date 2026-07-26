import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { ControlBar } from '../molecules/ControlBar.js';
import { CLIENT_STRINGS } from '../../config/strings.js';
import { ServerStatusPayload, ServerStatus } from '../../types.js';

interface ConsolePanelProps {
  status: ServerStatusPayload;
  logs: string[];
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onKill: () => void;
  onUpdate: () => void;
  onSendCommand: (cmd: string) => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  status,
  logs,
  selectedBranch,
  onBranchChange,
  onStart,
  onStop,
  onRestart,
  onKill,
  onUpdate,
  onSendCommand
}) => {
  const [commandInput, setCommandInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const isServerRunning = status.status === ServerStatus.Running;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCommandSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = commandInput.trim();
    if (!trimmed) return;
    onSendCommand(trimmed);
    setCommandInput('');
  };

  return (
    <div className="tab-content">
      <ControlBar
        status={status.status}
        selectedBranch={selectedBranch}
        onBranchChange={onBranchChange}
        onStart={onStart}
        onStop={onStop}
        onRestart={onRestart}
        onKill={onKill}
        onUpdate={onUpdate}
      />

      <div className="terminal-window">
        <div className="terminal-header">
          <span className="dot dot--red" />
          <span className="dot dot--yellow" />
          <span className="dot dot--green" />
          <span className="terminal-title">{CLIENT_STRINGS.CONSOLE_PANEL.TERMINAL_TITLE}</span>
        </div>

        <div className="terminal-body">
          {logs.map((log, index) => (
            <div key={index} className="log-line">
              {log}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        <form onSubmit={handleCommandSubmit} className="terminal-input-bar">
          <span className="prompt">&gt;</span>
          <input
            type="text"
            className="terminal-input"
            placeholder={CLIENT_STRINGS.CONSOLE_PANEL.INPUT_PLACEHOLDER}
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            disabled={!isServerRunning}
            aria-label={CLIENT_STRINGS.CONSOLE_PANEL.INPUT_PLACEHOLDER}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!isServerRunning}
          >
            {CLIENT_STRINGS.CONSOLE_PANEL.SEND_BTN}
          </button>
        </form>
      </div>
    </div>
  );
};
