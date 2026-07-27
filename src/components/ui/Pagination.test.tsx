import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination (tabla)', () => {
  it('muestra el rango de filas y el total', () => {
    render(<Pagination page={1} totalPages={3} onChange={() => {}} total={25} perPage={10} />);
    expect(screen.getByText('1-10 de 25')).toBeInTheDocument();
  });

  it('muestra 0 cuando no hay registros', () => {
    render(<Pagination page={1} totalPages={1} onChange={() => {}} total={0} perPage={10} />);
    expect(screen.getByText('0-0 de 0')).toBeInTheDocument();
  });

  it('renderiza un botón por página', () => {
    render(<Pagination page={2} totalPages={3} onChange={() => {}} total={30} perPage={10} />);
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });

  it('llama onChange con la página seleccionada', async () => {
    const onChange = vi.fn();
    render(<Pagination page={1} totalPages={3} onChange={onChange} total={30} perPage={10} />);
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('deshabilita "anterior" en la primera página', () => {
    const onChange = vi.fn();
    const { container } = render(<Pagination page={1} totalPages={3} onChange={onChange} total={30} perPage={10} />);
    const prev = container.querySelectorAll('button')[0];
    expect(prev).toBeDisabled();
  });

  it('cambia filas por página y reinicia a la página 1', async () => {
    const onChange = vi.fn();
    const onPerPageChange = vi.fn();
    render(
      <Pagination page={2} totalPages={3} onChange={onChange} total={30} perPage={10} onPerPageChange={onPerPageChange} />,
    );
    await userEvent.selectOptions(screen.getByRole('combobox'), '25');
    expect(onPerPageChange).toHaveBeenCalledWith(25);
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
