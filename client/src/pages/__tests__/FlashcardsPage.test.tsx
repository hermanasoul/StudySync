import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AxiosResponse } from 'axios';

jest.mock('../../services/api', () => ({
  flashcardsAPI: {
    getBySubject: jest.fn(),
    delete: jest.fn(),
  }
}));

import { flashcardsAPI } from '../../services/api';
import FlashcardsPage from '../FlashcardsPage'; // Путь к странице

const subjectId = 'biology';

const mockAxiosSuccess = (data: any): AxiosResponse<any> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} } as any
});

const mockCards = { flashcards: [{ _id: 'c1', front: 'Question', back: 'Answer', subjectId }] };
const emptyData = { flashcards: [] };

describe('FlashcardsPage Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads flashcards by subject on mount (valid data)', async () => {
    (flashcardsAPI.getBySubject as jest.MockedFunction<typeof flashcardsAPI.getBySubject>).mockResolvedValue(mockAxiosSuccess(mockCards));

    render(
      <MemoryRouter initialEntries={['/flashcards/biology']}> {/* Simulate URL /flashcards/:subjectId = 'biology' */}
        <FlashcardsPage /> {/* No prop needed — uses useParams or default */}
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Question')).toBeInTheDocument();
    });
    expect(flashcardsAPI.getBySubject).toHaveBeenCalledWith(subjectId);
  });

  it('shows empty state with no flashcards', async () => {
    (flashcardsAPI.getBySubject as jest.MockedFunction<typeof flashcardsAPI.getBySubject>).mockResolvedValue(mockAxiosSuccess(emptyData));

    render(
      <MemoryRouter initialEntries={['/flashcards/math']}> {/* Different subject for variety */}
        <FlashcardsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Нет карточек')).toBeInTheDocument();
    });
  });

  it('handles delete flashcard', async () => {
    (flashcardsAPI.getBySubject as jest.MockedFunction<typeof flashcardsAPI.getBySubject>).mockResolvedValue(mockAxiosSuccess(mockCards));
    (flashcardsAPI.delete as jest.MockedFunction<typeof flashcardsAPI.delete>).mockResolvedValue(mockAxiosSuccess({ success: true }));

    render(
      <MemoryRouter initialEntries={['/flashcards/biology']}>
        <FlashcardsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      screen.getByText('Question');
    });

    fireEvent.click(screen.getByTestId('delete-c1'));

    await waitFor(() => {
      expect(flashcardsAPI.delete).toHaveBeenCalledWith('c1');
    });
    expect(screen.queryByText('Question')).not.toBeInTheDocument();
  });

  it('opens create modal on button click', async () => {
    (flashcardsAPI.getBySubject as jest.MockedFunction<typeof flashcardsAPI.getBySubject>).mockResolvedValue(mockAxiosSuccess(emptyData));

    render(
      <MemoryRouter initialEntries={['/flashcards/biology']}>
        <FlashcardsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Создать карточку')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Создать карточку'));

    await waitFor(() => {
      expect(screen.getByText('Создать карточку')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('shows loading and error states', async () => {
    (flashcardsAPI.getBySubject as jest.MockedFunction<typeof flashcardsAPI.getBySubject>).mockRejectedValue({
      response: { ...mockAxiosSuccess({}), data: { error: 'Load error' } }
    });

    render(
      <MemoryRouter initialEntries={['/flashcards/biology']}>
        <FlashcardsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Загрузка...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Ошибка загрузки карточек')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});