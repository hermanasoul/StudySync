import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from '../Button';

// Наборы данных
const validProps = { children: 'Тест', variant: 'primary' as const, onClick: jest.fn() };
const invalidProps = { children: 'Тест', variant: 'invalid' as any }; // Edge-кейс: невалидный вариант

describe('Button Component (Unit Test)', () => {
  it('renders text correctly with valid props', () => {
    render(<Button {...validProps} />);
    expect(screen.getByText('Тест')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('btn-primary'); // Проверка стиля
  });

  it('calls onClick on button click', () => {
    render(<Button {...validProps} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(validProps.onClick).toHaveBeenCalledTimes(1);
  });

  it('does not crash with invalid variant (edge case)', () => {
    render(<Button {...invalidProps} />);
    // Ожидаем, что компонент не крашится, но вариант игнорируется (или fallback)
    expect(screen.getByText('Тест')).toBeInTheDocument();
    // В реальности, ESLint/TS предупредят, но тест проходит если нет throw
  });

  it('applies disabled state correctly', () => {
    render(<Button {...validProps} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveStyle('opacity: 0.6'); // Проверка CSS
  });
});
