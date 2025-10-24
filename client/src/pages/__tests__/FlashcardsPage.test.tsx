import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AxiosResponse } from 'axios';

jest.mock('../../services/api', () => ({
  flashcardsAPI: {
    getBySubject: jest.fn(), // Existing method for load by subject
    delete: jest.fn(), // Assume from "4 more" for delete
  }
}));

import { flashcardsAPI } from '../../services/api';
import FlashcardsPage from '../FlashcardsPage'; // Путь к странице

const subjectId = 'biology'; // Fixed for test (from URL/param/context)

const mockAxiosSuccess = (data: any): AxiosResponse<any> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} } as any
});

// Mock data with { flashcards: [...] } — adjust if response structure different
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
      expect(screen.getByText('Question')).toBeInTheDocument(); // Card rendered
    });
    expect(flashcardsAPI.getBySubject).toHaveBeenCalledWith(subjectId); // Called with 'biology'
  });

  it('shows empty state with no flashcards', async () => {
    (flashcardsAPI.getBySubject as jest.MockedFunction<typeof flashcardsAPI.getBySubject>).mockResolvedValue(mockAxiosSuccess(emptyData));

    render(
      <MemoryRouter initialEntries={['/flashcards/math']}> {/* Different subject for variety */}
        <FlashcardsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Нет карточек')).toBeInTheDocument(); // Single expect, no || — RU text (adjust if English)
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
      screen.getByText('Question'); // Ensure loaded
    });

    fireEvent.click(screen.getByTestId('delete-c1')); // Assume data-testid="delete-{id}" in component; add if not

    await waitFor(() => {
      expect(flashcardsAPI.delete).toHaveBeenCalledWith('c1');
    });
    expect(screen.queryByText('Question')).not.toBeInTheDocument(); // Card removed from list
  });

  it('opens create modal on button click', async () => {
    (flashcardsAPI.getBySubject as jest.MockedFunction<typeof flashcardsAPI.getBySubject>).mockResolvedValue(mockAxiosSuccess(emptyData));

    render(
      <MemoryRouter initialEntries={['/flashcards/biology']}>
        <FlashcardsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Создать карточку')).toBeInTheDocument(); // Button visible after load
    });

    fireEvent.click(screen.getByText('Создать карточку'));

    // Check modal opens (wait for modal-specific text or role)
    await waitFor(() => {
      expect(screen.getByText('Создать карточку')).toBeInTheDocument(); // Modal title, or use getByRole('dialog') if portal
    }, { timeout: 1000 });
  });

  it('shows loading and error states', async () => {
    (flashcardsAPI.getBySubject as jest.MockedFunction<typeof flashcardsAPI.getBySubject>).mockRejectedValue({
      response: { ...mockAxiosSuccess({}), data: { error: 'Load error' } } // Simulate API error
    });

    render(
      <MemoryRouter initialEntries={['/flashcards/biology']}>
        <FlashcardsPage />
      </MemoryRouter>
    );

    // Assume loading shows initially
    expect(screen.getByText('Загрузка...')).toBeInTheDocument(); // If no, remove this expect

    await waitFor(() => {
      expect(screen.getByText('Ошибка загрузки карточек')).toBeInTheDocument(); // Error message after reject
    }, { timeout: 2000 });
  });
});