import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AxiosResponse } from 'axios';

jest.mock('../../services/api', () => ({
  groupsAPI: {
    create: jest.fn()
  }
}));

import { groupsAPI } from '../../services/api';
import CreateGroupModal from '../CreateGroupModal'; // Путь к модалу

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
  onCancel?: () => void;
}

const validProps: CreateGroupModalProps = {
  isOpen: true,
  onClose: jest.fn(),
  onGroupCreated: jest.fn()
};

const validData = { name: 'Test Group', subject: 'Биология' };
const invalidData = { name: '', subject: 'Invalid' };

const mockAxiosSuccess = (data: any): AxiosResponse<any> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} } as any
});

describe('CreateGroupModal Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(
      <MemoryRouter>
        <CreateGroupModal {...validProps} />
      </MemoryRouter>
    );

    expect(screen.getByText('Создать группу')).toBeInTheDocument();
    expect(screen.getByLabelText('Название группы')).toBeInTheDocument();
    expect(screen.getByLabelText('Предмет')).toBeInTheDocument();
  });

  it('shows validation error on empty name submit', () => {
    render(
      <MemoryRouter>
        <CreateGroupModal {...validProps} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Название группы'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Создать'));

    expect(screen.getByText('Название обязательно')).toBeInTheDocument();
  });

  it('creates group on valid submit (API success)', async () => {
    (groupsAPI.create as jest.MockedFunction<typeof groupsAPI.create>).mockResolvedValue(mockAxiosSuccess({ success: true, group: validData }));

    render(
      <MemoryRouter>
        <CreateGroupModal {...validProps} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Название группы'), { target: { value: validData.name } });
    fireEvent.select(screen.getByLabelText('Предмет'), { target: { value: validData.subject } });
    fireEvent.click(screen.getByText('Создать'));

    await waitFor(() => {
      expect(groupsAPI.create).toHaveBeenCalledWith(validData);
      expect(validProps.onGroupCreated).toHaveBeenCalled();
      expect(validProps.onClose).toHaveBeenCalled();
    });
  });

  it('shows API error on invalid subject', async () => {
    (groupsAPI.create as jest.MockedFunction<typeof groupsAPI.create>).mockRejectedValue({
      response: mockAxiosSuccess({ error: 'Invalid subject' })
    });

    render(
      <MemoryRouter>
        <CreateGroupModal {...validProps} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Название группы'), { target: { value: invalidData.name } });
    fireEvent.select(screen.getByLabelText('Предмет'), { target: { value: invalidData.subject } });
    fireEvent.click(screen.getByText('Создать'));

    await waitFor(() => {
      expect(screen.getByText('Invalid subject')).toBeInTheDocument();
    });
  });

  it('closes modal on cancel', () => {
    render(
      <MemoryRouter>
        <CreateGroupModal {...validProps} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Отмена'));

    expect(validProps.onClose).toHaveBeenCalled();
  });
});