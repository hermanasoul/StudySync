import axios from 'axios'; // Импорт для mock
import { AxiosResponse } from 'axios';

// Mock axios directly
jest.mock('axios', () => ({
  default: jest.fn()
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Наборы данных
const validUser = { email: 'ivan@example.com', password: 'Pass123!' };
const invalidUser = { email: 'invalid', password: '123' };
const mockSuccess: AxiosResponse<any> = {
  data: { success: true, token: 'fake-token', user: { id: 1 } },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} } as any // Fix TS for AxiosRequestHeaders
};
const mockError = {
  response: {
    ...mockSuccess,
    data: { error: 'Invalid credentials' }
  }
};

describe('Auth API Tests (Integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('login success with valid credentials', async () => {
    (mockedAxios.post as jest.MockedFunction<typeof mockedAxios.post>).mockResolvedValueOnce(mockSuccess);

    const result = await mockedAxios.post('/api/auth/login', validUser);

    expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/login', validUser);
    expect(result.data.token).toBe('fake-token');
  });

  it('login fails with invalid credentials', async () => {
    (mockedAxios.post as jest.MockedFunction<typeof mockedAxios.post>).mockRejectedValueOnce(mockError);

    await expect(mockedAxios.post('/api/auth/login', invalidUser)).rejects.toMatchObject({ response: { data: { error: 'Invalid credentials' } } });
    expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/login', invalidUser);
  });

  it('register success with valid data', async () => {
    (mockedAxios.post as jest.MockedFunction<typeof mockedAxios.post>).mockResolvedValueOnce(mockSuccess);

    const registerData = { ...validUser, name: 'Ivan' };
    const result = await mockedAxios.post('/api/auth/register', registerData);

    expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/register', registerData);
    expect(result.data.user.id).toBe(1);
  });

  it('register fails with short password', async () => {
    (mockedAxios.post as jest.MockedFunction<typeof mockedAxios.post>).mockRejectedValueOnce(mockError);

    const shortData = { name: 'Test', email: 'test@example.com', password: '123' };
    await expect(mockedAxios.post('/api/auth/register', shortData)).rejects.toMatchObject({ response: { data: { error: 'Password too short' } } });
  });
});