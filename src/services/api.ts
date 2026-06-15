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
    Authorization: `Bearer ${token}`,
  };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

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
  dealerSearchResults?: DealerSearchResult[];
  dealerDetails?: DealerDetailsDto;
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

export interface DealerSearchResult {
  dealerId: string;
  dbaName: string;
  dealerStat: string;
  city: string | null;
  provState: string | null;
}

export interface DealerPagedResult {
  items: DealerSearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface DealerPagedParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  province?: string;
  sortBy?: string;
  sortDir?: string;
  excludeDemo?: boolean;
}

export interface DealerDetailsDto {
  dealerId: string;
  dbaName: string;
  legalName: string | null;
  dealerStat: string;
  dealerGroup: string | null;
  dealerCatg: string | null;
  city: string | null;
  provState: string | null;
  postalZip: string | null;
  phoneNum: string | null;
  faxNum: string | null;
  webPageUrl: string | null;
  territoryId: string;
  language: string | null;
  oem: string | null;
  isDealershipYN: string;
  isBrokerYN: string;
  producerMake: string | null;
  producerClass: string | null;
}

export interface ContractSearchResult {
  contractKey: number;
  contractNum: string;
  productId: string;
  dealerId: string;
  dealerName: string | null;
  contractStatPri: string;
  contractStatSec: string;
  effectDt: string;
  expiryDt: string | null;
  extContractNum: string | null;
}

export interface ContractPagedResult {
  items: ContractSearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ContractPagedParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  product?: string;
  dealerId?: string;
  sortBy?: string;
  sortDir?: string;
}

export interface ContractDetailsDto {
  contractKey: number;
  contractNum: string;
  companyId: string;
  productId: string;
  dealerId: string;
  dealerName: string | null;
  contractType: string;
  programId: string | null;
  contractStatPri: string;
  contractStatSec: string;
  createDt: string;
  createdBy: string;
  calcDt: string | null;
  finalDt: string | null;
  finalBy: string | null;
  effectDt: string;
  effectKm: number | null;
  expiryDt: string | null;
  expiryKm: number | null;
  lastTransferDt: string | null;
  lastCancelDt: string | null;
  lastReinstateDt: string | null;
  vehicleKey: number | null;
  numOfKm: number | null;
  numOfMiles: number | null;
  purchaseDt: string | null;
  deliveryDt: string | null;
  vehiclePrice: number;
  vehicleRebate: number | null;
  licensePlate: string | null;
  stockNum: string | null;
  vehicleCondition: string;
  classCode: string | null;
}

export interface ClaimSearchResult {
  claimKey: number;
  claimNum: string;
  contractKey: number;
  contractNum: string | null;
  claimType: string | null;
  lossDt: string;
  claimDt: string;
  claimStatPri: string;
  claimStatSec: string;
  adjusterId: string | null;
  claimDealerId: string | null;
  dealerName: string | null;
  roNum: string | null;
  extClaimNum: string | null;
}

export interface ClaimPagedResult {
  items: ClaimSearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ClaimPagedParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  claimType?: string;
  dealerId?: string;
  sortBy?: string;
  sortDir?: string;
}

export interface ClaimDetailsDto {
  claimKey: number;
  claimNum: string;
  contractKey: number;
  contractNum: string | null;
  claimType: string | null;
  lossDt: string;
  lossType: string | null;
  claimDt: string;
  eClaimReadyDt: string | null;
  submitDt: string | null;
  openDt: string | null;
  claimStatPri: string;
  claimStatSec: string;
  adjusterId: string | null;
  adjudPriority: string | null;
  adjudStat: string | null;
  closedDt: string | null;
  numOfKm: number | null;
  numOfMiles: number | null;
  liabilityLimit: number | null;
  overrideYN: string | null;
  overrideBy: string | null;
  overrideDt: string | null;
  licensePlate: string | null;
  roNum: string | null;
  contactName: string | null;
  contactPhoneNum: string | null;
  contactEmail: string | null;
  repairCenter: string | null;
  comments: string | null;
  extClaimNum: string | null;
  claimDealerId: string | null;
  dealerName: string | null;
  createdBy: string | null;
  createdDt: string | null;
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
  tool: 'getContractStatus' | 'checkEligibility' | 'checkCancellation' | 'getMaxMarkup' | 'activateProgram' | 'deactivateProgram' | 'searchDealer' | 'generalChat' | 'none';
  arguments?: {
    contractId?: string;
    dealerId?: string;
    dealerName?: string;
    productId?: string;
    productName?: string;
    programId?: string;
    programName?: string;
    effectiveDate?: string;
    searchQuery?: string;
    expiryDate?: string;
  };
  answer?: string;
}

interface ProgramActionResult {
  success: boolean;
  dealerCode: string;
  dealerName: string;
  programId: string;
  programName: string;
  product: string;
  action: string;
  effectiveDate: string;
  summary: string;
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

interface CancellationEligibilityResult {
  isEligible: boolean;
  contractNumber: string;
  status: string;
  product: string;
  effectiveDate: string;
  expiryDate: string;
  reason: string;
  refundAmount?: number;
  refundType: string;
  summary: string;
}

interface MaxMarkupResult {
  found: boolean;
  programId: string;
  programName: string;
  maxMarkup: number;
  summary: string;
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
  const toolName = String(candidate.tool || '');
  const tool: AgentToolCall['tool'] =
    toolName === 'getContractStatus' ? 'getContractStatus'
    : toolName === 'checkEligibility' ? 'checkEligibility'
    : toolName === 'checkCancellation' || toolName === 'checkCancellationEligibility' ? 'checkCancellation'
    : toolName === 'getMaxMarkup' || toolName === 'maxMarkup' || toolName === 'get_max_markup' ? 'getMaxMarkup'
    : toolName === 'activateProgram' || toolName === 'activate' ? 'activateProgram'
    : toolName === 'deactivateProgram' || toolName === 'deactivate' ? 'deactivateProgram'
    : toolName === 'searchDealer' || toolName === 'search_dealer' || toolName === 'findDealer' || toolName === 'listDealers' ? 'searchDealer'
    : toolName === 'generalChat' ? 'generalChat'
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
  const dealerId = typeof args.dealerId === 'string' ? args.dealerId
    : typeof args.dealer_id === 'string' ? args.dealer_id
    : typeof args.dealerCode === 'string' ? args.dealerCode
    : typeof args.dealer_code === 'string' ? args.dealer_code
    : typeof args.contractId === 'string' ? args.contractId
    : typeof candidate.dealerId === 'string' ? candidate.dealerId
    : typeof candidate.dealer_id === 'string' ? candidate.dealer_id
    : typeof candidate.dealerCode === 'string' ? candidate.dealerCode
    : typeof candidate.dealer_code === 'string' ? candidate.dealer_code
    : contractId;
  const dealerName = typeof args.dealerName === 'string' ? args.dealerName
    : typeof args.dealer_name === 'string' ? args.dealer_name
    : typeof candidate.dealerName === 'string' ? candidate.dealerName
    : typeof candidate.dealer_name === 'string' ? candidate.dealer_name
    : undefined;
  const productId = typeof args.productId === 'string' ? args.productId
    : typeof args.product_id === 'string' ? args.product_id
    : typeof candidate.productId === 'string' ? candidate.productId
    : typeof candidate.product_id === 'string' ? candidate.product_id
    : undefined;
  const productName = typeof args.productName === 'string' ? args.productName
    : typeof args.product_name === 'string' ? args.product_name
    : typeof args.product === 'string' ? args.product
    : typeof candidate.productName === 'string' ? candidate.productName
    : typeof candidate.product === 'string' ? candidate.product
    : undefined;
  const programId = typeof args.programId === 'string' ? args.programId
    : typeof args.program_id === 'string' ? args.program_id
    : typeof candidate.programId === 'string' ? candidate.programId
    : typeof candidate.program_id === 'string' ? candidate.program_id
    : undefined;
  const programName = typeof args.programName === 'string' ? args.programName
    : typeof args.program_name === 'string' ? args.program_name
    : typeof args.program === 'string' ? args.program
    : typeof candidate.programName === 'string' ? candidate.programName
    : typeof candidate.program === 'string' ? candidate.program
    : undefined;
  const effectiveDate = typeof args.effectiveDate === 'string' ? args.effectiveDate
    : typeof args.effective_date === 'string' ? args.effective_date
    : typeof candidate.effectiveDate === 'string' ? candidate.effectiveDate
    : undefined;
  const expiryDate = typeof args.expiryDate === 'string' ? args.expiryDate
    : typeof args.expiry_date === 'string' ? args.expiry_date
    : typeof args.date === 'string' ? args.date
    : typeof candidate.expiryDate === 'string' ? candidate.expiryDate
    : undefined;
  const searchQuery = typeof args.searchQuery === 'string' ? args.searchQuery
    : typeof args.search_query === 'string' ? args.search_query
    : typeof args.query === 'string' ? args.query
    : typeof candidate.searchQuery === 'string' ? candidate.searchQuery
    : typeof candidate.query === 'string' ? candidate.query
    : undefined;

  return {
    tool,
    arguments: { contractId, dealerId, dealerName, productId, productName, programId, programName, effectiveDate, expiryDate, searchQuery },
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
      content: `You are an intent classifier and entity extractor for a BackOffice dealer management system.
Analyze the user message and return ONLY a JSON object (no markdown, no explanation).

ENTITY DEFINITIONS:
- dealerId: A dealer code like "AB006624", "BC001234" (2 letters + 4-6 digits)
- dealerName: A business name like "Alberta Jeep", "Pacific Auto Group"
- productId: ONLY these exact abbreviations: "EW", "DW", "GAP", "RW", "PPM", "TR". Nothing else is a productId.
- productName: A full product name that matches: "Extended Warranty", "Dealer Warranty", "GAP Premium", "Replacement Warranty", "Pre-Paid Maintenance", "Tire & Rim"
- programId: An alphanumeric code with letters+digits like "AU220", "DW100", "GP001", "TR001", "RW100"
- programName: Any descriptive name that is NOT a known productName and NOT a known productId. Examples: "Retail Wearable Parts", "Extended Warranty Premium", "Dealer Warranty Plus"

TOOLS:
1. checkEligibility - When user asks if a dealer can sell/is eligible for a product or program.
   Return: {"tool":"checkEligibility","arguments":{...extracted entities...}}

2. getContractStatus - When user asks about the status of a specific contract.
   Return: {"tool":"getContractStatus","arguments":{"contractId":"THE_ID"}}

3. checkCancellation - When user asks if a contract is eligible for cancellation or can be cancelled.
   Return: {"tool":"checkCancellation","arguments":{"contractId":"CONTRACT_NUMBER"}}

4. activateProgram - When user wants to activate/enable/set up a program for a dealer.
   Return: {"tool":"activateProgram","arguments":{"dealerId":"DEALER","programId":"PROGRAM","effectiveDate":"YYYY-MM-DD or omit for today"}}

5. deactivateProgram - When user wants to deactivate/disable/expire/cancel a program for a dealer.
   Return: {"tool":"deactivateProgram","arguments":{"dealerId":"DEALER","programId":"PROGRAM","expiryDate":"YYYY-MM-DD or omit to ask"}}

6. getMaxMarkup - When user asks about the maximum markup for a program.
   Return: {"tool":"getMaxMarkup","arguments":{"programId":"PROGRAM_CODE"}} or {"tool":"getMaxMarkup","arguments":{"programName":"PROGRAM_NAME"}}

7. searchDealer - When user asks to find, list, search, look up, or show dealer(s). Extract whatever search text they provide (name, code, city, province).
   Return: {"tool":"searchDealer","arguments":{"searchQuery":"THE_SEARCH_TEXT"}}

8. generalChat - For general questions unrelated to eligibility or contracts.
   Return: {"tool":"generalChat"}

9. none - When you cannot determine intent or need more info.
   Return: {"tool":"none","answer":"your clarifying question"}

EXAMPLES:
User: "can AB006624 sell EW Retail Wearable Parts"
→ {"tool":"checkEligibility","arguments":{"dealerId":"AB006624","productId":"EW","programName":"Retail Wearable Parts"}}

User: "can AB006621 sell Retail Wearable Parts"
→ {"tool":"checkEligibility","arguments":{"dealerId":"AB006621","programName":"Retail Wearable Parts"}}

User: "Can Alberta Jeep sell AU220"
→ {"tool":"checkEligibility","arguments":{"dealerName":"Alberta Jeep","programId":"AU220"}}

User: "is BC006642 eligible for Extended Warranty"
→ {"tool":"checkEligibility","arguments":{"dealerId":"BC006642","productName":"Extended Warranty"}}

User: "can ON008800 sell GAP Premium under GP001"
→ {"tool":"checkEligibility","arguments":{"dealerId":"ON008800","productName":"GAP Premium","programId":"GP001"}}

User: "what is the status of contract AUMU02522380"
→ {"tool":"getContractStatus","arguments":{"contractId":"AUMU02522380"}}

User: "hello"
→ {"tool":"generalChat"}

User: "activate AU220 for AB006621"
→ {"tool":"activateProgram","arguments":{"dealerId":"AB006621","programId":"AU220"}}

User: "deactivate AU220 for AB006621 on 2026-07-01"
→ {"tool":"deactivateProgram","arguments":{"dealerId":"AB006621","programId":"AU220","expiryDate":"2026-07-01"}}

User: "deactivate AU220 for AB006621"
→ {"tool":"deactivateProgram","arguments":{"dealerId":"AB006621","programId":"AU220"}}

User: "set up DW100 for BC006642"
→ {"tool":"activateProgram","arguments":{"dealerId":"BC006642","programId":"DW100"}}

User: "expire GP001 for ON008800 today"
→ {"tool":"deactivateProgram","arguments":{"dealerId":"ON008800","programId":"GP001","expiryDate":"${new Date().toISOString().split('T')[0]}"}}

User: "Is contract AUMU02522381 eligible for cancellation?"
→ {"tool":"checkCancellation","arguments":{"contractId":"AUMU02522381"}}

User: "can I cancel contract EW12345"
→ {"tool":"checkCancellation","arguments":{"contractId":"EW12345"}}

User: "check cancellation eligibility for DW99887"
→ {"tool":"checkCancellation","arguments":{"contractId":"DW99887"}}

User: "what's the maximum markup on AU220"
→ {"tool":"getMaxMarkup","arguments":{"programId":"AU220"}}

User: "max markup for Retail Wearable Parts"
→ {"tool":"getMaxMarkup","arguments":{"programName":"Retail Wearable Parts"}}

User: "what is the max markup on DW100"
→ {"tool":"getMaxMarkup","arguments":{"programId":"DW100"}}

User: "find dealer AB006624"
→ {"tool":"searchDealer","arguments":{"searchQuery":"AB006624"}}

User: "list dealers in Alberta"
→ {"tool":"searchDealer","arguments":{"searchQuery":"Alberta"}}

User: "search for Pacific Auto"
→ {"tool":"searchDealer","arguments":{"searchQuery":"Pacific Auto"}}

User: "show me dealers in BC"
→ {"tool":"searchDealer","arguments":{"searchQuery":"BC"}}

User: "look up dealer Ontario Jeep"
→ {"tool":"searchDealer","arguments":{"searchQuery":"Ontario Jeep"}}

User: "list ab dealers"
→ {"tool":"searchDealer","arguments":{"searchQuery":"AB"}}

User: "dealer list by AB"
→ {"tool":"searchDealer","arguments":{"searchQuery":"AB"}}

User: "list active dealers in Alberta"
→ {"tool":"searchDealer","arguments":{"searchQuery":"Alberta"}}

User: "show all ON dealers"
→ {"tool":"searchDealer","arguments":{"searchQuery":"ON"}}

User: "dealers in Toronto"
→ {"tool":"searchDealer","arguments":{"searchQuery":"Toronto"}}

User: "who are the dealers in Quebec"
→ {"tool":"searchDealer","arguments":{"searchQuery":"Quebec"}}

User: "get me a list of BC dealers"
→ {"tool":"searchDealer","arguments":{"searchQuery":"BC"}}

User: "dealer search Calgary"
→ {"tool":"searchDealer","arguments":{"searchQuery":"Calgary"}}

User: "find all dealers"
→ {"tool":"searchDealer","arguments":{"searchQuery":""}}

User: "show dealer AB006621"
→ {"tool":"searchDealer","arguments":{"searchQuery":"AB006621"}}

RULES:
- CRITICAL: "eligible for cancellation", "can be cancelled", "cancel contract" → ALWAYS use checkCancellation, NEVER checkEligibility. The word "cancellation" or "cancel" in the context of a CONTRACT means checkCancellation.
- checkEligibility is ONLY for dealers selling products/programs. It always involves a DEALER.
- checkCancellation is for contracts being cancelled. It always involves a CONTRACT NUMBER.
- Only include fields you can extract from the message. Omit fields that are empty or not mentioned.
- productId is ONLY one of: EW, DW, GAP, RW, PPM, TR. Do NOT infer or abbreviate words into these codes. If the user did not type one of these exact codes, do NOT set productId.
- A code with letters+digits like AU220, DW100 is a programId, NOT a productId.
- If the text after "sell" is a multi-word phrase that is NOT a known product name, treat the entire phrase as programName.
- Do NOT guess or infer productId from words. "Retail" does NOT mean "RW". Only use productId if the user literally typed EW, DW, GAP, RW, PPM, or TR.
- CRITICAL for searchDealer: Any message about finding, listing, searching, showing, looking up, or getting dealers → ALWAYS use searchDealer. This includes "list X dealers", "dealer list", "dealers in X", "X dealers", "show dealer X", "get dealers", "who are the dealers". Extract the meaningful search text (city, province code, name, dealer code prefix) as searchQuery. Strip filler words like "list", "find", "show", "active", "all", "dealers", "dealer", "me", "the", "in", "by", "get".
- If the message mentions "dealer" combined with "list", "find", "search", "show", "look up", "get", or asks "who" about dealers → ALWAYS searchDealer, NEVER generalChat.
- Return ONLY the JSON object, nothing else.`,
    },
    { role: 'user', content },
  ]);

  return normalizeToolCall(extractJsonObject(modelResponse));
}

async function searchDealers(query: string): Promise<DealerSearchResult[]> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/dealers/search?q=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dealer Search Error: ${response.status} - ${errorText}`);
  }

  return await response.json() as DealerSearchResult[];
}

async function getDealersPaged(params: DealerPagedParams = {}): Promise<DealerPagedResult> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.province) searchParams.set('province', params.province);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDir) searchParams.set('sortDir', params.sortDir);
  if (params.excludeDemo) searchParams.set('excludeDemo', 'true');

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/dealers?${searchParams.toString()}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dealer List Error: ${response.status} - ${errorText}`);
  }

  return await response.json() as DealerPagedResult;
}

async function getDealerDetails(dealerCode: string): Promise<DealerDetailsDto> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/dealers/${encodeURIComponent(dealerCode)}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dealer Details Error: ${response.status} - ${errorText}`);
  }

  return await response.json() as DealerDetailsDto;
}

async function getContractsPaged(params: ContractPagedParams = {}): Promise<ContractPagedResult> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.product) searchParams.set('product', params.product);
  if (params.dealerId) searchParams.set('dealerId', params.dealerId);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDir) searchParams.set('sortDir', params.sortDir);

  const response = await authorizedFetch(
    `${CONTRACT_API_BASE_URL}/api/contracts?${searchParams.toString()}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Contract List Error: ${response.status} - ${errorText}`);
  }

  return await response.json() as ContractPagedResult;
}

async function getContractDetails(contractNum: string): Promise<ContractDetailsDto> {
  const response = await authorizedFetch(
    `${CONTRACT_API_BASE_URL}/api/contracts/${encodeURIComponent(contractNum)}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Contract Details Error: ${response.status} - ${errorText}`);
  }

  return await response.json() as ContractDetailsDto;
}

async function getClaimsPaged(params: ClaimPagedParams = {}): Promise<ClaimPagedResult> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.claimType) searchParams.set('claimType', params.claimType);
  if (params.dealerId) searchParams.set('dealerId', params.dealerId);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDir) searchParams.set('sortDir', params.sortDir);

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/claims?${searchParams.toString()}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claim List Error: ${response.status} - ${errorText}`);
  }

  return await response.json() as ClaimPagedResult;
}

async function getClaimDetails(claimNum: string): Promise<ClaimDetailsDto> {
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/claims/${encodeURIComponent(claimNum)}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claim Details Error: ${response.status} - ${errorText}`);
  }

  return await response.json() as ClaimDetailsDto;
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

async function checkCancellationEligibility(contractId: string): Promise<CancellationEligibilityResult> {
  const response = await authorizedFetch(
    `${CONTRACT_API_BASE_URL}/api/contracts/${encodeURIComponent(contractId)}/cancellation-eligibility`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cancellation Check Error: ${response.status} - ${errorText}`);
  }

  return await response.json() as CancellationEligibilityResult;
}

function formatCancellationResult(result: CancellationEligibilityResult): string {
  if (result.isEligible) {
    const lines = [
      `✅ **Yes — Eligible for Cancellation**`,
      ``,
      `**Contract:** ${result.contractNumber}`,
      `**Status:** ${result.status}`,
      `**Product:** ${result.product}`,
      `**Effective:** ${result.effectiveDate} — **Expiry:** ${result.expiryDate}`,
      `**Refund:** ${result.refundType}${result.refundAmount ? ` (${result.refundAmount}%)` : ''}`,
      ``,
      result.reason,
    ];
    return lines.join('\n');
  }

  return [
    `❌ **No — Not Eligible for Cancellation**`,
    ``,
    `**Contract:** ${result.contractNumber}`,
    `**Status:** ${result.status}`,
    `**Reason:** ${result.reason}`,
  ].join('\n');
}

async function getMaxMarkup(programIdOrName: string): Promise<MaxMarkupResult> {
  const params = new URLSearchParams();
  // If it looks like a program code (alphanumeric, short), use programId; else programName
  if (/^[A-Z0-9]{2,5}$/i.test(programIdOrName)) {
    params.set('programId', programIdOrName);
  } else {
    params.set('programName', programIdOrName);
  }

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/eligibility/max-markup?${params.toString()}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Max Markup Error: ${response.status} - ${errorText}`);
  }

  return await response.json() as MaxMarkupResult;
}

function formatMaxMarkupResult(result: MaxMarkupResult): string {
  if (!result.found) {
    return `❌ **Program Not Found**\n\n${result.summary}`;
  }

  if (result.maxMarkup === 0 && result.summary.includes('No markup records')) {
    return [
      `⚠️ **No Markup Data**`,
      ``,
      `**Program:** ${result.programId} (${result.programName})`,
      `**Result:** No markup records found for this program.`,
    ].join('\n');
  }

  return [
    `✅ **Maximum Markup**`,
    ``,
    `**Program:** ${result.programId} (${result.programName})`,
    `**Max Markup:** ${result.maxMarkup.toFixed(2)}`,
  ].join('\n');
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

async function checkEligibility(args: AgentToolCall['arguments']): Promise<EligibilityResult> {
  const params = new URLSearchParams();
  if (args?.dealerId) params.set('dealerId', args.dealerId);
  if (args?.dealerName) params.set('dealerName', args.dealerName);
  if (args?.productId) params.set('productId', args.productId);
  if (args?.productName) params.set('productName', args.productName);
  if (args?.programId) params.set('programId', args.programId);
  if (args?.programName) params.set('programName', args.programName);

  const response = await authorizedFetch(
    `${CONTRACT_API_BASE_URL}/api/eligibility?${params}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Eligibility API Error: ${response.status} - ${errorText}`);
  }

  return await response.json() as EligibilityResult;
}

async function activateProgram(dealerId: string, programId: string, effectiveDate?: string): Promise<ProgramActionResult> {
  const response = await authorizedFetch(`${CONTRACT_API_BASE_URL}/api/eligibility/activate`, {
    method: 'POST',
    body: JSON.stringify({ dealerId, programId, effectiveDate }),
  });

  const result = await response.json() as ProgramActionResult;
  return result;
}

async function deactivateProgram(dealerId: string, programId: string, expiryDate: string): Promise<ProgramActionResult> {
  const response = await authorizedFetch(`${CONTRACT_API_BASE_URL}/api/eligibility/deactivate`, {
    method: 'POST',
    body: JSON.stringify({ dealerId, programId, expiryDate }),
  });

  const result = await response.json() as ProgramActionResult;
  return result;
}

function formatEligibilityResult(result: EligibilityResult): string {
  if (result.isEligible) {
    return `✅ Yes — Eligible`;
  }

  let reason = 'Not set up for this product.';
  if (result.summary.toLowerCase().includes('suspended')) {
    reason = 'Dealer account is currently suspended.';
  } else if (result.summary.toLowerCase().includes('inactive')) {
    reason = 'Dealer account is inactive.';
  } else if (result.summary.toLowerCase().includes('expired')) {
    reason = 'Product enrollment has expired.';
  } else if (result.summary.toLowerCase().includes('not found')) {
    reason = 'Dealer was not found in the system.';
  } else if (result.summary.toLowerCase().includes('discontinued')) {
    reason = 'Program is discontinued.';
  } else if (result.summary.toLowerCase().includes('not activated')) {
    reason = 'Product is not activated for this dealer.';
  }

  return `❌ No — ${reason}`;
}

function detectEligibilityIntent(content: string): AgentToolCall | null {
  const lower = content.toLowerCase();

  // Detect cancellation intent first
  const cancellationKeywords = /\b(cancel|cancellation|eligible for cancellation|can .+ be cancel)/;
  if (cancellationKeywords.test(lower)) {
    const contractMatch = content.match(/\b([A-Z]{2,4}\d{6,10})\b/i);
    if (contractMatch) {
      return { tool: 'checkCancellation', arguments: { contractId: contractMatch[1] } };
    }
    // Try a general contract-like pattern
    const anyIdMatch = content.match(/(?:contract|#)\s*([A-Z0-9-]{5,})/i);
    if (anyIdMatch) {
      return { tool: 'checkCancellation', arguments: { contractId: anyIdMatch[1] } };
    }
    return { tool: 'checkCancellation', arguments: {} };
  }

  // Detect max markup intent
  const markupKeywords = /\b(max(?:imum)?\s*markup|markup)\b/i;
  if (markupKeywords.test(lower)) {
    const programCodeMatch = content.match(/\b([A-Z]{1,3}\d{2,4})\b/i);
    // Try to extract program name after "on" or "for"
    const programNameMatch = content.match(/(?:on|for)\s+["']?([^"'?]+?)["']?\s*$/i);
    if (programCodeMatch) {
      return { tool: 'getMaxMarkup', arguments: { programId: programCodeMatch[1] } };
    } else if (programNameMatch) {
      return { tool: 'getMaxMarkup', arguments: { programName: programNameMatch[1].trim() } };
    }
    return { tool: 'getMaxMarkup', arguments: {} };
  }

  const eligibilityKeywords = /\b(sell|eligible|eligibility|can .+ sell|enrolled|enroll|activate)\b/;
  if (!eligibilityKeywords.test(lower)) return null;

  // Extract dealer: try code pattern (XX######) first, then name from "can [name] sell"
  const dealerCodeMatch = content.match(/\b([A-Za-z]{2}\d{4,6})\b/);
  let dealerId: string | undefined;
  let dealerName: string | undefined;

  if (dealerCodeMatch) {
    dealerId = dealerCodeMatch[1];
  } else {
    // Extract dealer name between "can" and "sell/eligible/enroll"
    const nameMatch = content.match(/\bcan\s+(.+?)\s+(?:sell|be eligible|enroll)/i);
    if (nameMatch) {
      dealerName = nameMatch[1].trim();
    }
  }

  if (!dealerId && !dealerName) return null;

  // Extract text after "sell" or similar keyword
  const afterKeyword = content.match(/\b(?:sell|for|eligible for|enroll(?:ed)? (?:in|for))\s+(.+)/i);
  const rawText = afterKeyword ? afterKeyword[1].trim() : undefined;

  // Determine productId vs programId:
  // - If first token contains digits (e.g. AU220, DW100) → programId
  // - If first token is letters-only (e.g. EW, GAP) → productId
  let productId: string | undefined;
  let programId: string | undefined;
  let programName: string | undefined;

  if (rawText) {
    const parts = rawText.split(/\s+/);
    const firstToken = parts[0];

    if (/\d/.test(firstToken)) {
      // Contains digits → it's a program code (e.g. AU220)
      programId = firstToken;
      if (parts.length > 1) {
        programName = parts.slice(1).join(' ');
      }
    } else {
      // Letters only → it's a product code (e.g. EW)
      productId = firstToken;
      if (parts.length > 1) {
        programName = parts.slice(1).join(' ');
      }
    }
  }

  return {
    tool: 'checkEligibility',
    arguments: { dealerId, dealerName, productId, programId, programName },
  };
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

let lastMeaningfulMessage = '';
let lastEligibilityContext: { dealerCode: string; product: string } | null = null;
let pendingDeactivation: { dealerCode: string; product: string } | null = null;

function isRetryMessage(content: string): boolean {
  const lower = content.toLowerCase().trim();
  return /^(try again|again|retry|repeat|redo|one more time|do it again|same question)$/i.test(lower);
}

function isDeactivateMessage(content: string): boolean {
  const lower = content.toLowerCase().trim();
  return /^(deactivate|deactive|yes.*deactivate|yes.*deactive)$/i.test(lower);
}

function isExpiryResponse(content: string): { type: 'today' | 'future'; date?: string } | null {
  const lower = content.toLowerCase().trim();
  if (/^(today|expire today|yes.*today|now)$/i.test(lower)) {
    return { type: 'today' };
  }
  // Try to extract a date
  const dateMatch = content.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    return { type: 'future', date: dateMatch[1] };
  }
  if (/^(future|later|future date|another day|specific date)$/i.test(lower)) {
    return { type: 'future' };
  }
  return null;
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

  // Dealer search & details
  searchDealers: (query: string) => searchDealers(query),
  getDealersPaged: (params?: DealerPagedParams) => getDealersPaged(params),
  getDealerDetails: (dealerCode: string) => getDealerDetails(dealerCode),

  // Contract search & details
  getContractsPaged: (params?: ContractPagedParams) => getContractsPaged(params),
  getContractDetails: (contractNum: string) => getContractDetails(contractNum),

  // Claim search & details
  getClaimsPaged: (params?: ClaimPagedParams) => getClaimsPaged(params),
  getClaimDetails: (claimNum: string) => getClaimDetails(claimNum),

  sendLocalAgentMessage: async (content: string): Promise<MessageDto> => {
    // Handle pending deactivation expiry response
    if (pendingDeactivation) {
      const expiryResponse = isExpiryResponse(content);
      let expiryDate: string | null = null;

      if (expiryResponse) {
        expiryDate = expiryResponse.type === 'today'
          ? new Date().toISOString().split('T')[0]
          : expiryResponse.date || null;
      }

      // Check if user typed a bare date (YYYY-MM-DD) directly
      if (!expiryDate) {
        const dateMatch = content.trim().match(/^(\d{4}-\d{2}-\d{2})$/);
        if (dateMatch) expiryDate = dateMatch[1];
      }

      if (expiryDate) {
        const ctx = pendingDeactivation;
        pendingDeactivation = null;
        const result = await deactivateProgram(ctx.dealerCode, ctx.product, expiryDate);
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: result.success
            ? `✅ **Deactivation Successful**\n\n**Dealer:** ${result.dealerCode} (${result.dealerName})\n**Program:** ${result.programId} (${result.programName})\n**Expiry Date:** ${result.effectiveDate}\n\n${result.summary}`
            : `❌ **Deactivation Failed**\n\n${result.summary}`,
          timestamp: new Date().toISOString(),
        };
      }

      if (expiryResponse && expiryResponse.type === 'future') {
        // Keep pendingDeactivation so next message can provide the date
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: 'Please provide the expiry date in YYYY-MM-DD format (e.g., 2026-07-01).',
          timestamp: new Date().toISOString(),
        };
      }

      // If response doesn't match expiry options, cancel the flow
      pendingDeactivation = null;
    }

    // Handle "deactivate at DATE" pattern
    const deactivateWithDate = content.match(/deactivat(?:e|ion)\s+(?:at|on|for)\s+(\d{4}-\d{2}-\d{2})/i);
    if (deactivateWithDate && lastEligibilityContext) {
      const ctx = lastEligibilityContext;
      const result = await deactivateProgram(ctx.dealerCode, ctx.product, deactivateWithDate[1]);
      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: result.success
          ? `✅ **Deactivation Successful**\n\n**Dealer:** ${result.dealerCode} (${result.dealerName})\n**Program:** ${result.programId} (${result.programName})\n**Expiry Date:** ${result.effectiveDate}\n\n${result.summary}`
          : `❌ **Deactivation Failed**\n\n${result.summary}`,
        timestamp: new Date().toISOString(),
      };
    }

    // Handle deactivate action
    if (isDeactivateMessage(content) && lastEligibilityContext) {
      pendingDeactivation = lastEligibilityContext;
      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: `You are about to deactivate **${lastEligibilityContext.product}** for dealer **${lastEligibilityContext.dealerCode}**.\n\nWould you like the expiry to be effective today or on a future date?`,
        timestamp: new Date().toISOString(),
        suggestions: [
          { label: 'Today', action: 'today' },
          { label: 'Future Date', action: 'future date' },
        ],
      };
    }

    // Handle activate action (button click or typed)
    if (/^(activate|active|yes.*activate|set up|setup)$/i.test(content.trim()) && lastEligibilityContext) {
      const ctx = lastEligibilityContext;
      // ctx.product here might be a programId if last eligibility had programs
      const result = await activateProgram(ctx.dealerCode, ctx.product);
      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: result.success
          ? `✅ **Activation Successful**\n\n**Dealer:** ${result.dealerCode} (${result.dealerName})\n**Program:** ${result.programId} (${result.programName})\n**Effective:** ${result.effectiveDate}\n\n${result.summary}`
          : `❌ **Activation Failed**\n\n${result.summary}`,
        timestamp: new Date().toISOString(),
      };
    }

    // Handle retry/repeat messages by replaying the last meaningful message
    const effectiveContent = isRetryMessage(content) && lastMeaningfulMessage
      ? lastMeaningfulMessage
      : content;

    if (!isRetryMessage(content)) {
      lastMeaningfulMessage = content;
    }

    // Follow-up detection: if user provides just a dealer code and we have prior eligibility context,
    // treat it as the same eligibility check with the new dealer
    const followUpDealerMatch = effectiveContent.match(/\b([A-Z]{2}\d{4,6})\b/i);
    if (lastEligibilityContext && followUpDealerMatch && /^(what about|how about|and|check|same for|also)\b/i.test(effectiveContent.trim())) {
      const newDealerCode = followUpDealerMatch[1].toUpperCase();
      const eligibility = await checkEligibility({ dealerId: newDealerCode, programId: lastEligibilityContext.product });
      if (eligibility.isEligible) {
        lastEligibilityContext = { dealerCode: eligibility.dealerCode, product: eligibility.product };
      }
      const dealerNotFound = eligibility.summary.toLowerCase().includes('not found');
      const suggestions: SuggestedAction[] = eligibility.isEligible
        ? [{ label: 'Deactivate', action: 'deactivate', payload: `${eligibility.dealerCode}|${eligibility.product}` }]
        : (eligibility.dealerCode && !dealerNotFound)
          ? [{ label: 'Activate Product', action: 'activate', payload: `${eligibility.dealerCode}|${eligibility.product}` },
             { label: 'View Dealer Details', action: 'viewDealer', payload: eligibility.dealerCode }]
          : [];
      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: formatEligibilityResult(eligibility),
        timestamp: new Date().toISOString(),
        eligibilityResult: eligibility,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      };
    }

    // Use AI to understand intent and extract entities; fall back to regex if LLM fails
    let toolCall: AgentToolCall;
    try {
      toolCall = await askOllamaForToolCall(effectiveContent);
    } catch {
      toolCall = detectEligibilityIntent(effectiveContent) ?? { tool: 'none', answer: 'Sorry, I could not process that request.' };
    }

    // If LLM returned 'none' or 'generalChat' but regex detects a specific intent, use regex result
    if (toolCall.tool === 'none' || toolCall.tool === 'generalChat' || (toolCall.tool === 'checkEligibility' && !toolCall.arguments?.dealerId && !toolCall.arguments?.dealerName)) {
      const regexFallback = detectEligibilityIntent(effectiveContent);
      if (regexFallback) {
        toolCall = regexFallback;
      }
    }

    // Additional follow-up: LLM couldn't parse but message has a dealer code and we have context
    if ((toolCall.tool === 'none' || toolCall.tool === 'generalChat') && lastEligibilityContext && followUpDealerMatch) {
      const newDealerCode = followUpDealerMatch[1].toUpperCase();
      const eligibility = await checkEligibility({ dealerId: newDealerCode, programId: lastEligibilityContext.product });
      if (eligibility.isEligible) {
        lastEligibilityContext = { dealerCode: eligibility.dealerCode, product: eligibility.product };
      }
      const dealerNotFound = eligibility.summary.toLowerCase().includes('not found');
      const suggestions: SuggestedAction[] = eligibility.isEligible
        ? [{ label: 'Deactivate', action: 'deactivate', payload: `${eligibility.dealerCode}|${eligibility.product}` }]
        : (eligibility.dealerCode && !dealerNotFound)
          ? [{ label: 'Activate Product', action: 'activate', payload: `${eligibility.dealerCode}|${eligibility.product}` },
             { label: 'View Dealer Details', action: 'viewDealer', payload: eligibility.dealerCode }]
          : [];
      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: formatEligibilityResult(eligibility),
        timestamp: new Date().toISOString(),
        eligibilityResult: eligibility,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      };
    }

    // Second-pass AI check: if LLM missed a dealer search intent, ask again with a focused prompt
    if ((toolCall.tool === 'none' || toolCall.tool === 'generalChat') && /dealer/i.test(effectiveContent)) {
      try {
        const secondPass = await chatWithOllama([
          {
            role: 'system',
            content: `The user message is about dealers. Extract the search term they want to look up. Return ONLY a JSON object like: {"tool":"searchDealer","arguments":{"searchQuery":"THE_TERM"}}. The search term could be a dealer code (e.g. AB006624), a province code (AB, BC, ON, QC), a city name, or a dealer name. Strip filler words like "list", "find", "show", "dealers", "active", "in", "by", "all", "the". If the entire message is just about listing/finding dealers with no specific filter, use an empty string. Return ONLY the JSON.`,
          },
          { role: 'user', content: effectiveContent },
        ]);
        const secondResult = normalizeToolCall(extractJsonObject(secondPass));
        if (secondResult.tool === 'searchDealer') {
          toolCall = secondResult;
        }
      } catch {
        // If second pass fails, keep original toolCall
      }
    }

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

    if (toolCall.tool === 'checkCancellation') {
      const contractId = toolCall.arguments?.contractId?.trim();

      if (!contractId) {
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: 'Please provide a contract number to check cancellation eligibility.',
          timestamp: new Date().toISOString(),
        };
      }

      const result = await checkCancellationEligibility(contractId);

      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: formatCancellationResult(result),
        timestamp: new Date().toISOString(),
      };
    }

    if (toolCall.tool === 'getMaxMarkup') {
      const identifier = toolCall.arguments?.programId?.trim() || toolCall.arguments?.programName?.trim();

      if (!identifier) {
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: 'Please provide a program ID or program name to check the maximum markup.',
          timestamp: new Date().toISOString(),
        };
      }

      const result = await getMaxMarkup(identifier);

      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: formatMaxMarkupResult(result),
        timestamp: new Date().toISOString(),
      };
    }

    if (toolCall.tool === 'searchDealer') {
      const query = toolCall.arguments?.searchQuery?.trim() || toolCall.arguments?.dealerId?.trim() || toolCall.arguments?.dealerName?.trim() || '';

      const results = await searchDealers(query);

      if (results.length === 0) {
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: `No dealers found matching "${query}".`,
          timestamp: new Date().toISOString(),
        };
      }

      // If exactly one result, return details directly
      if (results.length === 1) {
        const details = await getDealerDetails(results[0].dealerId);
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: `Found dealer **${details.dbaName}** (${details.dealerId}).`,
          timestamp: new Date().toISOString(),
          dealerDetails: details,
        };
      }

      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: `Found ${results.length} dealer(s) matching "${query}".`,
        timestamp: new Date().toISOString(),
        dealerSearchResults: results,
      };
    }

    if (toolCall.tool === 'checkEligibility') {
      const args = toolCall.arguments;
      if (!args?.dealerId && !args?.dealerName) {
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: 'Please provide a dealer code or dealer name to check eligibility.',
          timestamp: new Date().toISOString(),
        };
      }

      const eligibility = await checkEligibility(args);

      // Save context for deactivation flow
      if (eligibility.isEligible) {
        lastEligibilityContext = { dealerCode: eligibility.dealerCode, product: eligibility.product };
      }

      // Use the API summary to determine if actions are appropriate
      const dealerNotFound = eligibility.summary.toLowerCase().includes('not found');

      const suggestions: SuggestedAction[] = eligibility.isEligible
        ? [
            { label: 'Deactivate', action: 'deactivate', payload: `${eligibility.dealerCode}|${eligibility.product}` },
          ]
        : (eligibility.dealerCode && !dealerNotFound)
          ? [
              { label: 'Activate Product', action: 'activate', payload: `${eligibility.dealerCode}|${eligibility.product}` },
              { label: 'View Dealer Details', action: 'viewDealer', payload: eligibility.dealerCode },
            ]
          : [];

      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: formatEligibilityResult(eligibility),
        timestamp: new Date().toISOString(),
        eligibilityResult: eligibility,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      };
    }

    if (toolCall.tool === 'activateProgram') {
      const args = toolCall.arguments;
      if (!args?.dealerId) {
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: 'Please provide a dealer code to activate the program.',
          timestamp: new Date().toISOString(),
        };
      }
      if (!args?.programId) {
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: 'Please provide a program ID (e.g., AU220, DW100) to activate.',
          timestamp: new Date().toISOString(),
        };
      }

      const result = await activateProgram(args.dealerId, args.programId, args.effectiveDate);
      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: result.success
          ? `✅ **Activation Successful**\n\n**Dealer:** ${result.dealerCode} (${result.dealerName})\n**Program:** ${result.programId} (${result.programName})\n**Effective:** ${result.effectiveDate}\n\n${result.summary}`
          : `❌ **Activation Failed**\n\n${result.summary}`,
        timestamp: new Date().toISOString(),
      };
    }

    if (toolCall.tool === 'deactivateProgram') {
      const args = toolCall.arguments;
      if (!args?.dealerId) {
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: 'Please provide a dealer code to deactivate the program.',
          timestamp: new Date().toISOString(),
        };
      }
      if (!args?.programId) {
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: 'Please provide a program ID (e.g., AU220, DW100) to deactivate.',
          timestamp: new Date().toISOString(),
        };
      }
      if (!args?.expiryDate) {
        // Ask for expiry date
        pendingDeactivation = { dealerCode: args.dealerId, product: args.programId };
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: `You are about to deactivate program **${args.programId}** for dealer **${args.dealerId}**.\n\nWould you like the expiry to be effective today or on a future date?`,
          timestamp: new Date().toISOString(),
          suggestions: [
            { label: 'Today', action: 'today' },
            { label: 'Future Date', action: 'future date' },
          ],
        };
      }

      const result = await deactivateProgram(args.dealerId, args.programId, args.expiryDate);
      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: result.success
          ? `✅ **Deactivation Successful**\n\n**Dealer:** ${result.dealerCode} (${result.dealerName})\n**Program:** ${result.programId} (${result.programName})\n**Expiry Date:** ${result.effectiveDate}\n\n${result.summary}`
          : `❌ **Deactivation Failed**\n\n${result.summary}`,
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

  // Support Tickets
  getSupportTickets: (type: SupportTicketType, search?: string) => {
    const params = new URLSearchParams({ type });
    if (search) params.set('search', search);
    return fetchApi<SupportTicketIndexEntry[]>(`/api/SupportTickets?${params}`);
  },
  getMySupportTickets: (email: string, type: SupportTicketType) =>
    fetchApi<SupportTicketIndexEntry[]>(`/api/SupportTickets/mine?email=${encodeURIComponent(email)}&type=${type}`),
  getSupportTicket: (id: string) =>
    fetchApi<SupportTicket>(`/api/SupportTickets/${id}`),
  createSupportTicket: async (data: CreateSupportTicketRequest): Promise<SupportTicket> => {
    const formData = new FormData();
    formData.append('type', data.type);
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('authorName', data.authorName);
    formData.append('authorEmail', data.authorEmail);
    if (data.severity) formData.append('severity', data.severity);
    if (data.stepsToReproduce) formData.append('stepsToReproduce', data.stepsToReproduce);
    if (data.browser) formData.append('browser', data.browser);
    if (data.os) formData.append('os', data.os);
    if (data.priority) formData.append('priority', data.priority);
    if (data.useCase) formData.append('useCase', data.useCase);
    if (data.urgency) formData.append('urgency', data.urgency);
    if (data.relatedModule) formData.append('relatedModule', data.relatedModule);
    if (data.files) {
      for (const file of data.files) formData.append('files', file);
    }
    const response = await authorizedFetch(`${API_BASE_URL}/api/SupportTickets`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    return response.json();
  },
  updateSupportTicket: async (id: string, data: Partial<CreateSupportTicketRequest> & { requesterEmail: string; deleteAttachments?: string[] }): Promise<SupportTicket> => {
    const formData = new FormData();
    formData.append('requesterEmail', data.requesterEmail);
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.severity) formData.append('severity', data.severity);
    if (data.stepsToReproduce) formData.append('stepsToReproduce', data.stepsToReproduce);
    if (data.browser) formData.append('browser', data.browser);
    if (data.os) formData.append('os', data.os);
    if (data.priority) formData.append('priority', data.priority);
    if (data.useCase) formData.append('useCase', data.useCase);
    if (data.urgency) formData.append('urgency', data.urgency);
    if (data.relatedModule) formData.append('relatedModule', data.relatedModule);
    if ((data as Record<string, unknown>).videoLink) formData.append('videoLink', (data as unknown as Record<string, string>).videoLink);
    if (data.files) {
      for (const file of data.files) formData.append('files', file);
    }
    if (data.deleteAttachments) {
      for (const fileName of data.deleteAttachments) formData.append('deleteAttachments', fileName);
    }
    const response = await authorizedFetch(`${API_BASE_URL}/api/SupportTickets/${id}`, {
      method: 'PUT',
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    return response.json();
  },
  updateSupportTicketStatus: (id: string, status: string, requesterEmail: string) =>
    fetchApi<SupportTicket>(`/api/SupportTickets/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, requesterEmail }),
    }),
  deleteSupportTicket: (id: string, requesterEmail: string) =>
    fetchApi<void>(`/api/SupportTickets/${id}?requesterEmail=${encodeURIComponent(requesterEmail)}`, {
      method: 'DELETE',
    }),
  addSupportTicketComment: (id: string, text: string, authorName: string, email: string) =>
    fetchApi<SupportTicket>(`/api/SupportTickets/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text, authorName, email }),
    }),
  deleteSupportTicketComment: (ticketId: string, commentId: string) =>
    fetchApi<void>(`/api/SupportTickets/${ticketId}/comments/${commentId}`, {
      method: 'DELETE',
    }),
  getSupportTicketAttachment: (id: string, fileName: string) =>
    `${API_BASE_URL}/api/SupportTickets/${id}/attachments/${encodeURIComponent(fileName)}`,
  getSupportTicketAttachmentBlob: async (id: string, fileName: string): Promise<string> => {
    const response = await authorizedFetch(
      `${API_BASE_URL}/api/SupportTickets/${id}/attachments/${encodeURIComponent(fileName)}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch attachment: ${response.status}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },
};

// Support Ticket types
export type SupportTicketType = 'bug' | 'feature' | 'help';
export type TicketStatus = 'New' | 'InProgress' | 'Resolved' | 'Closed';
export type BugSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type FeaturePriority = 'Must-have' | 'Nice-to-have';
export type HelpUrgency = 'Blocking' | 'Non-blocking';

export interface SupportTicketComment {
  id: string;
  text: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
}

export interface SupportTicketAttachment {
  fileName: string;
  contentType: string;
  size: number;
}

export interface SupportTicket {
  id: string;
  type: SupportTicketType;
  title: string;
  description: string;
  authorName: string;
  authorEmail: string;
  status: TicketStatus;
  comments: SupportTicketComment[];
  attachments: SupportTicketAttachment[];
  createdAt: string;
  updatedAt: string;
  // Bug-specific
  severity?: BugSeverity;
  stepsToReproduce?: string;
  browser?: string;
  os?: string;
  // Feature-specific
  priority?: FeaturePriority;
  useCase?: string;
  // Help-specific
  urgency?: HelpUrgency;
  relatedModule?: string;
}

export interface SupportTicketIndexEntry {
  id: string;
  type: SupportTicketType;
  title: string;
  authorName: string;
  authorEmail: string;
  status: TicketStatus;
  commentCount: number;
  attachmentCount: number;
  severity?: BugSeverity;
  priority?: FeaturePriority;
  urgency?: HelpUrgency;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupportTicketRequest {
  type: SupportTicketType;
  title: string;
  description: string;
  authorName: string;
  authorEmail: string;
  files?: File[];
  // Bug
  severity?: BugSeverity;
  stepsToReproduce?: string;
  browser?: string;
  os?: string;
  // Feature
  priority?: FeaturePriority;
  useCase?: string;
  // Help
  urgency?: HelpUrgency;
  relatedModule?: string;
}
