import { ApiResponse } from '../types';
import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL;
const TIMEOUT_MS = 10000;

class ApiService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.timeout = TIMEOUT_MS;
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    const token = await authService.getIdToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(response.status);
      }

      const data = await response.json();
      return { data: data as T, status: response.status };
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(-1); // timeout
      }

      if (error instanceof TypeError) {
        throw new ApiError(0); // network error
      }

      throw new ApiError(0);
    }
  }

  async post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    const token = await authService.getIdToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(response.status);
      }

      const data = await response.json();
      return { data: data as T, status: response.status };
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(-1); // timeout
      }

      if (error instanceof TypeError) {
        throw new ApiError(0); // network error
      }

      throw new ApiError(0);
    }
  }
}

export class ApiError extends Error {
  public status: number;

  constructor(status: number) {
    super(`API Error: ${status}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const apiService = new ApiService();
