import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AxiosResponse } from 'axios';

jest.mock('axios', () => ({
  default: jest.fn()
}));

import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

import Dashboard from '../DashboardPage'; // Путь к странице

// Типы data
const mockGroups: { _id: string; name: string }[] = [{ _id: 'g1', name: 'Test Group' }];
const mockEmpty: any[] = []; // Typed as any[] for empty array

const mockAxiosSuccess = (data: any): AxiosResponse<any> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} } as any // Fix TS for AxiosRequestHeaders
});

describe('Dashboard Page Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard with groups on load', async () => {
    (mockedAxios.get as jest.MockedFunction<typeof mockedAxios.get>).mockResolvedValue(mockAxiosSuccess({ groups: mockGroups }));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Test Group')).toBeInTheDocument());
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/dashboard/groups');
  });

  it('shows empty state with no groups', async () => {
    (mockedAxios.get as jest.MockedFunction<typeof mockedAxios.get>).mockResolvedValue(mockAxiosSuccess({ groups: mockEmpty }));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Нет групп')).toBeInTheDocument());
  });

  it('loads stats correctly', async () => {
    (mockedAxios.get as jest.MockedFunction<typeof mockedAxios.get>).mockResolvedValue(mockAxiosSuccess({ totalGroups: 5 }));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('5 групп')).toBeInTheDocument());
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/dashboard/stats');
  });
});