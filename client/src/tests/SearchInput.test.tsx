import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import '../i18n/index.js';
import { SearchInput } from '../components/atoms/SearchInput.js';

describe('SearchInput atom', () => {
  it('renders an input with the current value', () => {
    render(<SearchInput value="" onChange={() => undefined} placeholder="Find..." />);
    const input = screen.getByPlaceholderText('Find...') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe('');
  });

  it('calls onChange when the user types', () => {
    let captured = '';
    render(
      <SearchInput
        value={captured}
        onChange={(v) => { captured = v; }}
        placeholder="Find..."
      />
    );
    const input = screen.getByPlaceholderText('Find...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(captured).toBe('hello');
  });

  it('shows the clear button only when value is non-empty', () => {
    const { rerender } = render(
      <SearchInput value="" onChange={() => undefined} placeholder="Find..." />
    );
    expect(screen.queryByRole('button', { name: /clear search/i })).toBeNull();

    rerender(
      <SearchInput value="x" onChange={() => undefined} placeholder="Find..." />
    );
    expect(screen.getByRole('button', { name: /clear search/i })).toBeDefined();
  });

  it('emits empty string and onClear when clear is clicked', () => {
    let captured = 'something';
    const onClear = () => { captured = 'cleared'; };
    render(
      <SearchInput
        value="something"
        onChange={(v) => { captured = v; }}
        onClear={onClear}
        placeholder="Find..."
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
    expect(captured).toBe('cleared');
  });
});
