import { msalInstance } from '../auth/AuthProvider';
import { loginRequest } from '../auth/authConfig';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const OLLAMA_API_BASE_URL = import.meta.env.VITE_OLLAMA_API_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:3b';
const CONTRACT_API_BASE_URL = import.meta.env.VITE_CONTRACT_API_BASE_URL || API_BASE_URL;

async function getAccessToken(): Promise<string | null> {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    return null;
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });
    return response.accessToken;
  } catch {
    try {
      const response = await msalInstance.acquireTokenPopup(loginRequest);
      return response.accessToken;
    } catch {
      return null;
    }
  }
}

async function authorizedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not signed in. Please sign in with your work account before calling backend APIs.');
  }

  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  return fetch(url, { ...options, headers });
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await authorizedFetch(`${API_BASE_URL}${endpoint}`, options);

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
  suggestions?: SuggestedAction[];
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

export interface SuggestedAction {
  label: string;
  action: string;
  payload?: string;
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

interface AgentToolCall {
  tool: 'getContractStatus' | 'generalChat' | 'none';
  arguments?: {
    contractId?: string;
  };
  answer?: string;
}

interface ContractStatus {
  contractId: string;
  status: string;
  owner: string;
  product: string;
  effectiveDate: string;
  lastUpdated: string;
  source: string;
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');

    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }

    throw new Error('Model did not return valid JSON.');
  }
}

function normalizeToolCall(value: unknown): AgentToolCall {
  if (!value || typeof value !== 'object') {
    return { tool: 'none', answer: 'I could not understand that request.' };
  }

  const candidate = value as Record<string, unknown>;
  const tool = candidate.tool === 'getContractStatus'
    ? 'getContractStatus'
    : candidate.tool === 'generalChat'
      ? 'generalChat'
      : 'none';
  const args = candidate.arguments && typeof candidate.arguments === 'object'
    ? candidate.arguments as Record<string, unknown>
    : {};
  const contractId = typeof args.contractId === 'string'
    ? args.contractId
    : typeof candidate.contractId === 'string'
      ? candidate.contractId
      : typeof candidate.contract_id === 'string'
        ? candidate.contract_id
        : undefined;

  return {
    tool,
    arguments: { contractId },
    answer: typeof candidate.answer === 'string' ? candidate.answer : undefined,
  };
}

async function chatWithOllama(messages: OllamaMessage[]): Promise<string> {
  const response = await fetch(`${OLLAMA_API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as OllamaChatResponse;
  const content = data.message?.content?.trim();

  if (!content) {
    throw new Error('Ollama returned an empty response.');
  }

  return content;
}

async function askOllamaForToolCall(content: string): Promise<AgentToolCall> {
  const modelResponse = await chatWithOllama([
    {
      role: 'system',
      content: `You are a tool router for a BackOffice demo chat.
Return only one JSON object. Do not use markdown.

Available tools:
- getContractStatus(contractId: string): use when the user asks for the current status/state of a contract.

If the user asks for contract status and provides a contract id, return:
{"tool":"getContractStatus","arguments":{"contractId":"CONTRACT_ID"}}

If the user asks for contract status but does not provide a contract id, return:
{"tool":"none","answer":"Please provide a contract id."}

If the request is unrelated, return:
{"tool":"generalChat"}`,
    },
    { role: 'user', content },
  ]);

  return normalizeToolCall(extractJsonObject(modelResponse));
}

async function getContractStatus(contractId: string): Promise<ContractStatus> {
  const response = await authorizedFetch(
    `${CONTRACT_API_BASE_URL}/api/contracts/${encodeURIComponent(contractId)}/status`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Contract API Error: ${response.status} - ${errorText}`);
  }

  return await response.json() as ContractStatus;
}

function formatContractStatus(status: ContractStatus): string {
  return [
    `Contract ${status.contractId} is currently ${status.status}.`,
    `Owner: ${status.owner}.`,
    `Product: ${status.product}.`,
    `Effective date: ${status.effectiveDate}.`,
    `Last updated: ${new Date(status.lastUpdated).toLocaleString()}.`,
    `Source: ${status.source}.`,
  ].join('\n');
}

async function answerGeneralChat(content: string): Promise<string> {
  return chatWithOllama([
    {
      role: 'system',
      content: `You are Team PnC, a concise BackOffice demo assistant.
Answer simple general questions directly in English.
The current date is ${new Date().toLocaleDateString()}.
If the user asks about contract status, ask them for a contract id or tell them to use a question like: What is the status of contract AUMU02522380?
Do not claim to access backend systems unless a tool result is provided.`,
    },
    { role: 'user', content },
  ]);
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

  sendLocalAgentMessage: async (content: string): Promise<MessageDto> => {
    const toolCall = await askOllamaForToolCall(content);

    if (toolCall.tool === 'getContractStatus') {
      const contractId = toolCall.arguments?.contractId?.trim();

      if (!contractId) {
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: 'Please provide a contract id.',
          timestamp: new Date().toISOString(),
        };
      }

      const contractStatus = await getContractStatus(contractId);

      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: formatContractStatus(contractStatus),
        timestamp: new Date().toISOString(),
      };
    }

    if (toolCall.tool === 'none') {
      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: toolCall.answer || 'Please provide more details.',
        timestamp: new Date().toISOString(),
      };
    }

    const answer = await answerGeneralChat(content);

    return {
      id: createId('local-assistant'),
      conversationId: 'local-ollama-demo',
      role: 'assistant',
      content: answer,
      timestamp: new Date().toISOString(),
    };
  },

  // Health
  health: () => fetch(`${API_BASE_URL}/api/health`).then(r => r.json()),
};
