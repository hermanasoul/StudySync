import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AxiosResponse } from 'axios';

jest.mock('../../services/api', () => ({
  flashcardsAPI: {
    create: jest.fn()
  }
}));

import { flashcardsAPI } from '../../services/api';
import CreateFlashcardModal from '../CreateFlashcardModal';

interface CreateFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFlashcardCreated: () => void;
  subjectId: string;
  groupId?: string;
}

const validProps: CreateFlashcardModalProps = {
  isOpen: true,
  onClose: jest.fn(),
  onFlashcardCreated: jest.fn(),
  subjectId: 'biology'
};

const emptyData = { front: '', back: 'Answer', subjectId: '' };
const validData = { front: 'Question', back: 'Answer', subjectId: 'biology' };

const mockAxiosSuccess = (data: any): AxiosResponse<any> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} } as any
});

describe('CreateFlashcardModal Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(
      <MemoryRouter>
        <CreateFlashcardModal {...validProps} />
      </MemoryRouter>
    );

    expect(screen.getByText('Создать карточку')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Вопрос')).toBeInTheDocument();
  });

  it('shows error on empty front submit', () => {
    render(
      <MemoryRouter>
        <CreateFlashcardModal {...validProps} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Вопрос'), { target: { value: emptyData.front } });
    fireEvent.click(screen.getByText('Создать'));

    expect(screen.getByText('Заполните все поля')).toBeInTheDocument();
  });

  it('creates flashcard with valid data (success API)', async () => {
    (flashcardsAPI.create as jest.MockedFunction<typeof flashcardsAPI.create>).mockResolvedValue(mockAxiosSuccess({ success: true, flashcard: validData }));

    render(
      <MemoryRouter>
        <CreateFlashcardModal {...validProps} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Вопрос'), { target: { value: validData.front } });
    fireEvent.change(screen.getByPlaceholderText('Ответ'), { target: { value: validData.back } });
    fireEvent.click(screen.getByText('Создать'));

    await waitFor(() => {
      expect(flashcardsAPI.create).toHaveBeenCalledWith({ ...validData, subjectId: validProps.subjectId });
      expect(validProps.onFlashcardCreated).toHaveBeenCalled();
      expect(validProps.onClose).toHaveBeenCalled();
    });
  });

  it('shows error on invalid API response', async () => {
    (flashcardsAPI.create as jest.MockedFunction<typeof flashcardsAPI.create>).mockRejectedValue({
      response: mockAxiosSuccess({ error: 'Invalid data' })
    });

    render(
      <MemoryRouter>
        <CreateFlashcardModal {...validProps} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Вопрос'), { target: { value: emptyData.front } });
    fireEvent.click(screen.getByText('Создать'));

    await waitFor(() => {
      expect(screen.getByText('Ошибка создания')).toBeInTheDocument();
    });
  });

  it('closes modal on cancel', () => {
    render(
      <MemoryRouter>
        <CreateFlashcardModal {...validProps} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Отмена'));

    expect(validProps.onClose).toHaveBeenCalled();
  });
});