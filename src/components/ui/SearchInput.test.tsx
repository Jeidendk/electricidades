import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from './SearchInput';

describe('SearchInput (formulario)', () => {
  it('usa el placeholder por defecto', () => {
    render(<SearchInput value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
  });

  it('acepta un placeholder personalizado', () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Buscar equipo..." />);
    expect(screen.getByPlaceholderText('Buscar equipo...')).toBeInTheDocument();
  });

  it('refleja el valor controlado', () => {
    render(<SearchInput value="laptop" onChange={() => {}} />);
    expect(screen.getByDisplayValue('laptop')).toBeInTheDocument();
  });

  it('emite onChange con cada carácter tecleado', async () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText('Buscar...'), 'abc');
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenLastCalledWith('c');
  });
});
