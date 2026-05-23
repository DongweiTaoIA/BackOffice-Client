import { msalInstance } from '../auth/AuthProvider';
import { loginRequest } from '../auth/authConfig';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function getAccessToken(): Promise<string> {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error('No authenticated user');
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });
    return response.accessToken;
  } catch {
    const response = await msalInstance.acquireTokenPopup(loginRequest);
    return response.accessToken;
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Types matching API models
export interface ConversationDto {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: MessageDto[];
}

export interface MessageDto {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  eligibilityResult?: EligibilityResult;
}

export interface EligibilityResult {
  isEligible: boolean;
  dealerCode: string;
  dealerName: string;
  product: string;
  environment: string;
  programs: ProgramInfo[];
  summary: string;
}

export interface ProgramInfo {
  code: string;
  name: string;
  status: string;
}

// API methods
export const api = {
  // Conversations
  getConversations: () => fetchApi<ConversationDto[]>('/api/conversations'),
  getConversation: (id: string) => fetchApi<ConversationDto>(`/api/conversations/${id}`),
  createConversation: (title: string) =>
    fetchApi<ConversationDto>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  deleteConversation: (id: string) =>
    fetchApi<void>(`/api/conversations/${id}`, { method: 'DELETE' }),
  sendMessage: (conversationId: string, content: string) =>
    fetchApi<MessageDto>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Health
  health: () => fetch(`${API_BASE_URL}/api/health`).then(r => r.json()),
};
