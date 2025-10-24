import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AxiosResponse } from 'axios';

jest.mock('../../services/api', () => ({
  groupsAPI: {
    join: jest.fn()
  }
}));

import { groupsAPI } from '../../services/api';
import JoinGroupModal from '../JoinGroupModal'; // Путь к компоненту

// Типы для data
const validProps = { isOpen: true, onClose: jest.fn(), onJoinSuccess: jest.fn() };
const invalidCode = '';
const validCode = 'ABC123';

const mockAxiosSuccess = (data: any): AxiosResponse<any> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} } as any
});

describe('JoinGroupModal Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open', async () => {
    render(
      <MemoryRouter>
        <JoinGroupModal {...validProps} />
      </MemoryRouter>
    );

    expect(screen.getByText('Присоединиться к группе')).toBeInTheDocument();
  });

  it('shows error on empty code submit', () => {
    render(
      <MemoryRouter>
        <JoinGroupModal {...validProps} />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Введите код приглашения...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByText('Присоединиться'));

    expect(screen.getByText('Введите код приглашения')).toBeInTheDocument();
  });

  it('joins group with valid code (success API)', async () => {
    (groupsAPI.join as jest.MockedFunction<typeof groupsAPI.join>).mockResolvedValue(mockAxiosSuccess({ success: true }));

    render(
      <MemoryRouter>
        <JoinGroupModal {...validProps} />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Введите код приглашения...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: validCode } });
    fireEvent.click(screen.getByText('Присоединиться'));

    await waitFor(() => {
      expect(groupsAPI.join).toHaveBeenCalledWith(validCode);
      expect(validProps.onJoinSuccess).toHaveBeenCalled();
      expect(validProps.onClose).toHaveBeenCalled();
    });
  });

  it('shows error on invalid API response', async () => {
    (groupsAPI.join as jest.MockedFunction<typeof groupsAPI.join>).mockRejectedValue({
      response: mockAxiosSuccess({ error: 'Invalid code' })
    });

    render(
      <MemoryRouter>
        <JoinGroupModal {...validProps} />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Введите код приглашения...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: invalidCode } });
    fireEvent.click(screen.getByText('Присоединиться'));

    await waitFor(() => {
      expect(screen.getByText('Ошибка при присоединении к группе')).toBeInTheDocument();
    });
  });

  it('closes modal on cancel', () => {
    render(
      <MemoryRouter>
        <JoinGroupModal {...validProps} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Отмена'));

    expect(validProps.onClose).toHaveBeenCalled();
  });
});