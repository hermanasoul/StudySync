import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react-dom/test-utils';
import { AxiosResponse } from 'axios'; // Импорт для type assertion
import GroupPage from '../../pages/GroupPage'; // Корректируй путь, если отличается

// Jest.mock для API
jest.mock('../../services/api', () => ({
  groupsAPI: {
    getById: jest.fn(),
    getNotes: jest.fn(),
    getMembers: jest.fn(),
    getFlashcards: jest.fn()
  }
}));

import { groupsAPI } from '../../services/api';

// Наборы данных
const mockGroup = {
  _id: 'g1',
  name: 'Биология 101',
  subjectId: { _id: 's1', name: 'Биология', color: 'green' },
  createdBy: { _id: '1', name: 'Иван Иванов' },
  members: [{ user: { _id: '1', name: 'Иван Иванов', email: 'ivan@example.com' }, role: 'owner' }],
  isPublic: true,
  inviteCode: 'ABC123'
};

// Вспомогательная функция для полного AxiosResponse (исправлена для TS)
const mockAxiosResponse = (data: any, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: { headers: {} } // Добавлено вложенное headers для полного match
}) as any as AxiosResponse; // Type assertion для обхода детальных проверок

describe('GroupPage Component (Integration Test)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders group details on success', async () => {
    (groupsAPI.getById as jest.MockedFunction<typeof groupsAPI.getById>).mockResolvedValue(mockAxiosResponse({ success: true, group: mockGroup }));
    (groupsAPI.getNotes as jest.MockedFunction<typeof groupsAPI.getNotes>).mockResolvedValue(mockAxiosResponse({ success: true, notes: [] }));
    (groupsAPI.getMembers as jest.MockedFunction<typeof groupsAPI.getMembers>).mockResolvedValue(mockAxiosResponse(mockGroup.members));
    (groupsAPI.getFlashcards as jest.MockedFunction<typeof groupsAPI.getFlashcards>).mockResolvedValue(mockAxiosResponse({ success: true, flashcards: [] }));

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/groups/g1']}>
          <GroupPage />
        </MemoryRouter>
      );
    });

    await waitFor(() => expect(screen.getByText('Биология 101')).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText('ABC123')).toBeInTheDocument();
    expect(screen.getByText(/1 участников/)).toBeInTheDocument();
    expect(groupsAPI.getById).toHaveBeenCalledWith('g1');
  });

  it('shows error on invalid group ID', async () => {
    (groupsAPI.getById as jest.MockedFunction<typeof groupsAPI.getById>).mockRejectedValue(mockAxiosResponse({ error: 'Group not found' }, 404));
    (groupsAPI.getNotes as jest.MockedFunction<typeof groupsAPI.getNotes>).mockResolvedValue(mockAxiosResponse({ success: true, notes: [] }));
    (groupsAPI.getMembers as jest.MockedFunction<typeof groupsAPI.getMembers>).mockResolvedValue(mockAxiosResponse([]));
    (groupsAPI.getFlashcards as jest.MockedFunction<typeof groupsAPI.getFlashcards>).mockResolvedValue(mockAxiosResponse({ success: true, flashcards: [] }));

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/groups/invalid']}>
          <GroupPage />
        </MemoryRouter>
      );
    });

    await waitFor(() => expect(screen.getByText('Группа не найдена')).toBeInTheDocument(), { timeout: 3000 });
    expect(groupsAPI.getById).toHaveBeenCalledWith('invalid');
  });
});
