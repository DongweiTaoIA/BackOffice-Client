import { msalInstance } from '../auth/AuthProvider';
import { loginRequest } from '../auth/authConfig';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:5011';
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
  /** When the assistant wants the host UI to open the cancellation page for a contract. */
  cancellationResult?: CancellationEligibilityResult;
}

export interface EligibilityResult {
  isEligible: boolean;
  dealerCode: string;
  dealerName: string;
  /** Display label for the product as it appeared in the query (e.g. "Extended Warranty" or "EW"). */
  product: string;
  /** Canonical product code resolved by the backend (e.g. "EW", "DW"). Always a stable code, never a display name. */
  productId?: string;
  /** Program code resolved by the backend (e.g. "EWXX001"). Populated when the query referenced a specific program. */
  programId?: string;
  /** Program display name resolved by the backend (e.g. "Retail Wearable Parts"). */
  programName?: string;
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

export interface ProgramLookupResult {
  programId: string;
  programName: string;
  programNameFr?: string | null;
  /** Parent product code (ContractGroup), e.g. "EW", "DW". */
  productId: string;
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

  // Optional / extended properties exposed by the backend.
  importYN?: string | null;
  claimOption?: string | null;
  commercialYN?: string | null;
  companyName?: string | null;
  companyRepKey?: number | null;
  financingType?: string | null;
  financedAmt?: number | null;
  downPaymentAmt?: number | null;
  promoValue?: string | null;
  apr?: number | null;
  lienHolderId?: string | null;
  lienHolderLabel?: string | null;
  lienHolderBranchId?: string | null;
  financialInstId?: string | null;
  financialInstLabel?: string | null;
  premiumFinInst?: string | null;
  customer1Key?: number | null;
  customer2Key?: number | null;
  isAboriginalYN?: string | null;
  aboriginalCardNum?: string | null;
  isBuyerResidesOnReserveYN?: string | null;
  isBuyerDeliverToReserveYN?: string | null;
  language?: string;
  paymentFreq?: string | null;
  paymentStat?: string;
  paymentMeth?: string | null;
  isReceivedYN?: string;
  formRevKey?: number | null;
  consentFormRevKey?: number | null;
  contractSource?: string;
  extContractNum?: string | null;
  isVehicleRegisteredYN?: string;
  mespMonths?: number | null;
  mespKm?: number | null;
  brokerId?: string | null;
  brokerName?: string | null;
  modDtTime?: string;
  modLoginId?: string;
  computedFinanceType?: string | null;

  // Enriched customer / vehicle / claim info (from dmCustomer, dmVehicle, dmClaim).
  customer1Name?: string | null;
  customer2Name?: string | null;
  customerAddress?: string | null;
  customerCity?: string | null;
  customerProvState?: string | null;
  customerPostalZip?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  vin?: string | null;
  vehicleYear?: number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleOdometer?: number | null;
  openClaimCount?: number;
  totalClaimCount?: number;
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

export interface CancellationMessage {
  msgText: string;
  /** Single-char message type from the SP (e.g. "E" error/explanation, "W" warning, "I" info). */
  msgType: string;
}

export interface CancellationRefundDetails {
  // Customer refund side.
  retailPremiumPaidAmount?: number;
  refundAmount?: number;
  factor?: number;
  claimsPaidAmount?: number;
  adminFee?: number;
  netRefundAmount?: number;
  refundTax1Amount?: number;
  refundTax2Amount?: number;
  totalRefund?: number;
  // Dealer chargeback side.
  dealerMarkupAmount?: number;
  dealerMarkupPercentage?: number;
  netDealerChargebackAmount?: number;
  chargebackTax1Amount?: number;
  chargebackTax2Amount?: number;
  dealerChargebackAmount?: number;
  iapPortionAmount?: number;
  // Tax & cheque flags.
  tax1Value?: number;
  tax2Value?: number;
  enableIssueChequeYN?: string;
  tax1RemitYN?: string | null;
  tax2RemitYN?: string | null;
}

export interface CancellationEligibilityResult {
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
  /** Messages returned by DPP_DP612ContractCancel_Calc (warnings / rule explanations). */
  messages?: CancellationMessage[];
  /** Full refund / chargeback breakdown returned by DPP_DP612ContractCancel_Calc. */
  refundDetails?: CancellationRefundDetails;
}

export interface CancellationEligibilityParams {
  /** Cancellation date (YYYY-MM-DD). Defaults to today on the server. */
  cancDt?: string;
  /** Cancellation rule ID, e.g. "CR001" (Customer Cancellation). */
  ruleId?: string;
  /** Cancel type, e.g. "CS" (Customer), "DL" (Dealer). */
  cancType?: string;
  /** Language: "E" or "F". */
  lang?: string;
  /** Override user id passed to the SP. */
  userId?: string;
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
    return { tool: 'none', answer: t('couldNotUnderstand') };
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

// ---------- Language detection & localization ----------
type Lang = 'fr' | 'en';

// Detected language for the current user message. Updated at the start of
// sendLocalAgentMessage and consumed by formatters / LLM prompts.
let currentLanguage: Lang = 'en';

function detectLanguage(text: string): Lang {
  const t = text.toLowerCase().trim();

  // Suggestion-button action keywords and short control messages don't carry
  // language information — keep the current sticky language instead.
  const controlKeyword = /^(deactivate|deactive|activate|active|today|future date|future|later|now|yes|no|try again|again|retry|repeat|redo|one more time|do it again|same question|set up|setup|\d{4}-\d{2}-\d{2})$/i;
  if (controlKeyword.test(t)) return currentLanguage;

  // French-specific diacritics are a strong signal.
  if (/[àâäçéèêëîïôöùûüÿœæ]/i.test(text)) return 'fr';

  // Common French words / phrases that don't appear (or rarely) in English.
  const frenchMarkers = /\b(est-ce que|peut|peut-il|peut-elle|vendre|vente|bonjour|merci|comment|pourquoi|combien|quoi|où|quel|quelle|quels|quelles|oui|non|aujourd'hui|demain|hier|qui|aussi|encore|donc|alors|avec|sans|pour|dans|sur|chez|annuler|annulation|activer|désactiver|désactivation|marchand|concessionnaire|contrat|produit|programme|éligible|admissible|svp|s'il vous plaît|s'il te plaît)\b/i;
  if (frenchMarkers.test(t)) return 'fr';

  return 'en';
}

const translations = {
  yesEligible:                 { en: '✅ Yes — Eligible',                                                    fr: '✅ Oui — Admissible' },
  noEligibleNotSet:            { en: '❌ No — Not set up for this product.',                                fr: '❌ Non — Le produit n\'est pas configuré.' },
  noEligibleSuspended:         { en: '❌ No — Dealer account is currently suspended.',                      fr: '❌ Non — Le compte du marchand est actuellement suspendu.' },
  noEligibleInactive:          { en: '❌ No — Dealer account is inactive.',                                 fr: '❌ Non — Le compte du marchand est inactif.' },
  noEligibleExpired:           { en: '❌ No — Product enrollment has expired.',                             fr: '❌ Non — L\'inscription au produit est expirée.' },
  noEligibleDealerNotFound:    { en: '❌ No — Dealer was not found in the system.',                         fr: '❌ Non — Le marchand est introuvable dans le système.' },
  noEligibleDiscontinued:      { en: '❌ No — Program is discontinued.',                                    fr: '❌ Non — Le programme est discontinué.' },
  noEligibleNotActivated:      { en: '❌ No — Product is not activated for this dealer.',                   fr: '❌ Non — Le produit n\'est pas activé pour ce marchand.' },

  cancelEligibleHeader:        { en: '✅ **Yes — Eligible for Cancellation**',                              fr: '✅ **Oui — Admissible à l\'annulation**' },
  cancelNotEligibleHeader:     { en: '❌ **No — Not Eligible for Cancellation**',                           fr: '❌ **Non — Non admissible à l\'annulation**' },
  cancelPromptQuestion:        { en: 'Do you want to cancel this contract?',                                fr: 'Voulez-vous annuler ce contrat ?' },
  cancelOpeningPage:           { en: 'Opening cancellation page…',                                          fr: 'Ouverture de la page d\'annulation…' },
  cancelDeclined:              { en: 'OK — cancellation not started.',                                      fr: 'D\'accord — annulation non démarrée.' },
  labelCancelContract:         { en: 'Cancel Contract',                                                     fr: 'Annuler le contrat' },
  labelNotNow:                 { en: 'Not now',                                                             fr: 'Pas maintenant' },
  fieldContract:               { en: '**Contract:**',                                                       fr: '**Contrat :**' },
  fieldStatus:                 { en: '**Status:**',                                                         fr: '**Statut :**' },
  fieldProduct:                { en: '**Product:**',                                                        fr: '**Produit :**' },
  fieldEffectiveExpiry:        { en: '**Effective:**',                                                      fr: '**Effectif :**' },
  fieldExpiry:                 { en: '**Expiry:**',                                                         fr: '**Expiration :**' },
  fieldRefund:                 { en: '**Refund:**',                                                         fr: '**Remboursement :**' },
  fieldReason:                 { en: '**Reason:**',                                                         fr: '**Raison :**' },
  fieldDealer:                 { en: '**Dealer:**',                                                         fr: '**Marchand :**' },
  fieldProgram:                { en: '**Program:**',                                                        fr: '**Programme :**' },
  fieldExpiryDate:             { en: '**Expiry Date:**',                                                    fr: '**Date d\'expiration :**' },
  fieldMaxMarkup:              { en: '**Max Markup:**',                                                     fr: '**Marge maximale :**' },

  programNotFound:             { en: '❌ **Program Not Found**',                                            fr: '❌ **Programme introuvable**' },
  noMarkupData:                { en: '⚠️ **No Markup Data**',                                              fr: '⚠️ **Aucune donnée de marge**' },
  noMarkupRecords:             { en: '**Result:** No markup records found for this program.',              fr: '**Résultat :** Aucun enregistrement de marge trouvé pour ce programme.' },
  maxMarkupHeader:             { en: '✅ **Maximum Markup**',                                               fr: '✅ **Marge maximale**' },

  activationSuccess:           { en: '✅ **Activation Successful**',                                        fr: '✅ **Activation réussie**' },
  activationFailed:            { en: '❌ **Activation Failed**',                                            fr: '❌ **Échec de l\'activation**' },
  deactivationSuccess:         { en: '✅ **Deactivation Successful**',                                      fr: '✅ **Désactivation réussie**' },
  deactivationFailed:          { en: '❌ **Deactivation Failed**',                                         fr: '❌ **Échec de la désactivation**' },
  effective:                   { en: '**Effective:**',                                                      fr: '**Effectif :**' },

  pleaseProvideContractId:     { en: 'Please provide a contract id.',                                       fr: 'Veuillez fournir un numéro de contrat.' },
  pleaseProvideContractCancel: { en: 'Please provide a contract number to check cancellation eligibility.', fr: 'Veuillez fournir un numéro de contrat pour vérifier l\'admissibilité à l\'annulation.' },
  pleaseProvideProgramMarkup:  { en: 'Please provide a program ID or program name to check the maximum markup.', fr: 'Veuillez fournir un ID ou un nom de programme pour vérifier la marge maximale.' },
  pleaseProvideDealerEligib:   { en: 'Please provide a dealer code or dealer name to check eligibility.',   fr: 'Veuillez fournir un code ou un nom de marchand pour vérifier l\'admissibilité.' },
  pleaseProvideDealerActiv:    { en: 'Please provide a dealer code to activate the program.',              fr: 'Veuillez fournir un code de marchand pour activer le programme.' },
  pleaseProvideProgramActiv:   { en: 'Please provide a program ID (e.g., AU220, DW100) to activate.',      fr: 'Veuillez fournir un ID de programme (ex. : AU220, DW100) à activer.' },
  pleaseProvideDealerDeact:    { en: 'Please provide a dealer code to deactivate the program.',            fr: 'Veuillez fournir un code de marchand pour désactiver le programme.' },
  pleaseProvideProgramDeact:   { en: 'Please provide a program ID (e.g., AU220, DW100) to deactivate.',    fr: 'Veuillez fournir un ID de programme (ex. : AU220, DW100) à désactiver.' },
  pleaseProvideExpiryFmt:      { en: 'Please provide the expiry date in YYYY-MM-DD format (e.g., 2026-07-01).', fr: 'Veuillez fournir la date d\'expiration au format AAAA-MM-JJ (ex. : 2026-07-01).' },
  pleaseProvideMoreDetails:    { en: 'Please provide more details.',                                        fr: 'Veuillez fournir plus de détails.' },
  couldNotProcess:             { en: 'Sorry, I could not process that request.',                            fr: 'Désolé, je n\'ai pas pu traiter cette demande.' },
  couldNotUnderstand:          { en: 'I could not understand that request.',                                fr: 'Je n\'ai pas pu comprendre cette demande.' },

  noDealersFound:              { en: 'No dealers found matching',                                           fr: 'Aucun marchand trouvé pour' },
  foundDealer:                 { en: 'Found dealer',                                                        fr: 'Marchand trouvé :' },
  foundDealers:                { en: 'Found',                                                               fr: 'Trouvé' },
  dealersMatching:             { en: 'dealer(s) matching',                                                  fr: 'marchand(s) correspondant à' },

  aboutToDeactivateProg:       { en: 'You are about to deactivate program',                                 fr: 'Vous êtes sur le point de désactiver le programme' },
  aboutToDeactivate:           { en: 'You are about to deactivate',                                         fr: 'Vous êtes sur le point de désactiver' },
  forDealer:                   { en: 'for dealer',                                                          fr: 'pour le marchand' },
  expiryTodayOrFuture:         { en: 'Would you like the expiry to be effective today or on a future date?', fr: 'Souhaitez-vous que l\'expiration soit effective aujourd\'hui ou à une date future ?' },

  labelToday:                  { en: 'Today',                                                               fr: 'Aujourd\'hui' },
  labelFutureDate:             { en: 'Future Date',                                                         fr: 'Date future' },
  labelDeactivate:             { en: 'Deactivate',                                                          fr: 'Désactiver' },
  labelActivateProduct:        { en: 'Activate Product',                                                    fr: 'Activer le produit' },
  labelViewDealerDetails:      { en: 'View Dealer',                                                         fr: 'Voir le marchand' },

  contractIsCurrently:         { en: 'is currently',                                                        fr: 'est actuellement' },
  owner:                       { en: 'Owner',                                                               fr: 'Propriétaire' },
  product:                     { en: 'Product',                                                             fr: 'Produit' },
  effectiveDate:               { en: 'Effective date',                                                      fr: 'Date d\'entrée en vigueur' },
  lastUpdated:                 { en: 'Last updated',                                                        fr: 'Dernière mise à jour' },
  source:                      { en: 'Source',                                                              fr: 'Source' },
  contractWord:                { en: 'Contract',                                                            fr: 'Contrat' },
} as const;

function t(key: keyof typeof translations, lang: Lang = currentLanguage): string {
  return translations[key][lang];
}

function languageName(lang: Lang): string {
  return lang === 'fr' ? 'French' : 'English';
}
// ---------- End language helpers ----------

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

// ---------- Two-stage LLM routing ----------
// Stage 1: a small focused prompt asks the local LLM to emit ONLY the tool name.
// Stage 2: a per-tool prompt asks the LLM to extract just the entities that
// tool needs. Splitting the work keeps each prompt short and reliable on
// tiny local models (e.g. llama3.2:3b) without resorting to brittle regex.

type RoutableTool = Exclude<AgentToolCall['tool'], 'none'>;

const ROUTABLE_TOOLS: readonly RoutableTool[] = [
  'checkEligibility',
  'checkCancellation',
  'getContractStatus',
  'getMaxMarkup',
  'activateProgram',
  'deactivateProgram',
  'searchDealer',
  'generalChat',
];

async function classifyTool(content: string): Promise<RoutableTool> {
  const response = await chatWithOllama([
    {
      role: 'system',
      content: `You are the router for the BackOffice dealer-management API.
Pick the SINGLE best tool to handle the user's message.

TOOLS (return exactly one of these names):
- checkEligibility — User asks if a DEALER CAN SELL a product/program, or IS ELIGIBLE / ENROLLED for one. Triggers: "can X sell Y", "is X eligible for Y", "is X enrolled in Y".
- checkCancellation — User asks whether a CONTRACT can be cancelled. Triggers: "cancel contract Z", "is contract Z eligible for cancellation", "can I cancel Z".
- getContractStatus — User asks the STATUS of a CONTRACT. Triggers: "status of contract Z", "what is the state of contract Z".
- getMaxMarkup — User asks the MAXIMUM MARKUP of a program. Triggers: "max markup on Y", "what is the markup for Y".
- activateProgram — User wants to ACTIVATE / SET UP a program for a dealer. Triggers: "activate Y for X", "set up Y for X".
- deactivateProgram — User wants to DEACTIVATE / EXPIRE / DISABLE a program for a dealer. Triggers: "deactivate Y for X", "expire Y for X".
- searchDealer — User wants to FIND / LIST / SHOW / SEARCH dealers WITHOUT asking about products or eligibility. Triggers: "find dealer X", "list dealers in BC", "show me Pacific Auto".
- generalChat — Greetings, small talk, or any other request not handled above.

CRITICAL ROUTING RULES (apply BEFORE anything else):
1. If the message uses "sell", "eligible", "eligibility", or "enrolled" AND mentions both a dealer and a product/program → checkEligibility. NEVER searchDealer.
2. "cancel" / "cancellation" referring to a CONTRACT → checkCancellation. NEVER checkEligibility.
3. The user may write in English or French. Classify regardless of language.

EXAMPLES:
"Can Eagle Ridge Chevrolet Buick GMC Ltd sell AU220" → checkEligibility
"Is BC006642 eligible for Extended Warranty"         → checkEligibility
"Est-ce que AB006621 peut vendre AU220 ?"            → checkEligibility
"What is the status of contract AUMU02522380"        → getContractStatus
"Can I cancel contract EW12345"                       → checkCancellation
"Max markup on AU220"                                 → getMaxMarkup
"Activate AU220 for AB006621"                         → activateProgram
"Deactivate AU220 for AB006621"                       → deactivateProgram
"List dealers in BC"                                  → searchDealer
"Find Pacific Auto"                                   → searchDealer
"Hello"                                               → generalChat

Respond with ONLY the tool name on a single line. No JSON, no quotes, no explanation.`,
    },
    { role: 'user', content },
  ]);

  // Strict match first (alphanumeric only, case-insensitive).
  const stripped = response.trim().toLowerCase().replace(/[^a-z]/g, '');
  const exact = ROUTABLE_TOOLS.find(name => name.toLowerCase() === stripped);
  if (exact) return exact;
  // Loose match: pick the first known tool name that appears in the response.
  const lower = response.toLowerCase();
  const loose = ROUTABLE_TOOLS.find(name => lower.includes(name.toLowerCase()));
  if (loose) return loose;
  return 'generalChat';
}

const EXTRACTOR_PROMPTS: Record<Exclude<RoutableTool, 'generalChat'>, string> = {
  checkEligibility: `Extract entities from a dealer-product eligibility question. Return ONLY a JSON object. Include only the fields present in the message; omit anything not stated.

FIELDS:
- dealerId: dealer code like "AB006624", "BC001234" (2 letters + 4-6 digits).
- dealerName: business name like "Driveco Motors", "Eagle Ridge Chevrolet Buick GMC Ltd". Capture the WHOLE multi-word name between "Can" and "sell" / "is" and "eligible".
- productId: ONLY if the user literally typed EW, DW, GAP, RW, PPM, or TR. Do NOT infer.
- productName: full product name like "Extended Warranty", "GAP Premium", "Pre-Paid Maintenance".
- programId: alphanumeric code with both letters AND digits like "AU220", "DW100", "GP001".
- programName: any other descriptive name (e.g. "Retail Wearable Parts"). If the user wrote "EW Retail Wearable Parts", productId is "EW" and programName is "Retail Wearable Parts".

RULES:
- A code like AU220 / DW100 is a programId, NEVER a productId.
- Do not invent fields. Empty/missing → omit the field.

EXAMPLES:
User: "Can Driveco Motors sell EW Retail Wearable Parts?"
JSON: {"dealerName":"Driveco Motors","productId":"EW","programName":"Retail Wearable Parts"}

User: "Can BC006642 sell EW Retail Wearable Parts?"
JSON: {"dealerId":"BC006642","productId":"EW","programName":"Retail Wearable Parts"}

User: "Can Eagle Ridge Chevrolet Buick GMC Ltd sell AU220"
JSON: {"dealerName":"Eagle Ridge Chevrolet Buick GMC Ltd","programId":"AU220"}

User: "is BC006642 eligible for Extended Warranty"
JSON: {"dealerId":"BC006642","productName":"Extended Warranty"}

User: "Est-ce que AB006621 peut vendre AU220 ?"
JSON: {"dealerId":"AB006621","programId":"AU220"}

User: "can ON008800 sell GAP Premium under GP001"
JSON: {"dealerId":"ON008800","productName":"GAP Premium","programId":"GP001"}

Return ONLY the JSON object, nothing else.`,

  checkCancellation: `Extract the contract id for a cancellation eligibility check. Return ONLY: {"contractId":"..."}.

EXAMPLES:
User: "Is contract AUMU02522381 eligible for cancellation?"
JSON: {"contractId":"AUMU02522381"}

User: "can I cancel contract EW12345"
JSON: {"contractId":"EW12345"}

User: "check cancellation eligibility for DW99887"
JSON: {"contractId":"DW99887"}

Return ONLY the JSON.`,

  getContractStatus: `Extract the contract id. Return ONLY: {"contractId":"..."}.

EXAMPLES:
User: "what is the status of contract AUMU02522380"
JSON: {"contractId":"AUMU02522380"}

User: "status of EW12345"
JSON: {"contractId":"EW12345"}

Return ONLY the JSON.`,

  getMaxMarkup: `Extract program identity for a max-markup lookup. Return ONLY: {"programId":?,"programName":?}. Use programId for alphanumeric codes (e.g. AU220, DW100); otherwise programName. Omit the unused field.

EXAMPLES:
User: "what's the maximum markup on AU220"
JSON: {"programId":"AU220"}

User: "max markup for Retail Wearable Parts"
JSON: {"programName":"Retail Wearable Parts"}

User: "what is the max markup on DW100"
JSON: {"programId":"DW100"}

Return ONLY the JSON.`,

  activateProgram: `Extract activation arguments. Return ONLY: {"dealerId":?,"programId":?,"effectiveDate":?}. dealerId is the dealer code (XX######). programId is an alphanumeric code (e.g. AU220). effectiveDate format YYYY-MM-DD; omit if not provided.

EXAMPLES:
User: "activate AU220 for AB006621"
JSON: {"dealerId":"AB006621","programId":"AU220"}

User: "set up DW100 for BC006642"
JSON: {"dealerId":"BC006642","programId":"DW100"}

Return ONLY the JSON.`,

  deactivateProgram: `Extract deactivation arguments. Return ONLY: {"dealerId":?,"programId":?,"expiryDate":?}. Same formats as activate; omit expiryDate if the user did not give one.

EXAMPLES:
User: "deactivate AU220 for AB006621 on 2026-07-01"
JSON: {"dealerId":"AB006621","programId":"AU220","expiryDate":"2026-07-01"}

User: "deactivate AU220 for AB006621"
JSON: {"dealerId":"AB006621","programId":"AU220"}

User: "expire GP001 for ON008800 today"
JSON: {"dealerId":"ON008800","programId":"GP001","expiryDate":"${new Date().toISOString().split('T')[0]}"}

Return ONLY the JSON.`,

  searchDealer: `Extract the search term. Return ONLY: {"searchQuery":"..."}. The query may be a dealer code (AB006624), a province code (AB, BC, ON, QC), a city, or a business name. Strip filler words like "find", "list", "show", "dealers", "active", "all", "the", "in", "by", "get", "me", "who". If the user wants ALL dealers, use an empty string.

EXAMPLES:
User: "find dealer AB006624"
JSON: {"searchQuery":"AB006624"}

User: "list dealers in Alberta"
JSON: {"searchQuery":"Alberta"}

User: "show all ON dealers"
JSON: {"searchQuery":"ON"}

User: "search Pacific Auto"
JSON: {"searchQuery":"Pacific Auto"}

User: "find all dealers"
JSON: {"searchQuery":""}

Return ONLY the JSON.`,
};

async function extractArgsForTool(tool: RoutableTool, content: string): Promise<AgentToolCall> {
  if (tool === 'generalChat') return { tool: 'generalChat' };

  let parsedArgs: unknown = {};
  try {
    const response = await chatWithOllama([
      { role: 'system', content: EXTRACTOR_PROMPTS[tool] },
      { role: 'user', content },
    ]);
    parsedArgs = extractJsonObject(response);
  } catch {
    // If extraction fails, return the tool with no args — downstream code
    // will prompt the user for missing pieces.
    parsedArgs = {};
  }

  // Reuse the existing normalizer to coerce field types, then force the
  // routed tool (the normalizer only inspects the `tool` key we pass in,
  // but we want to be explicit that stage 1 decides routing).
  const normalized = normalizeToolCall({ tool, arguments: parsedArgs });
  normalized.tool = tool;

  // Regex backstop: small local models occasionally emit empty {} for the
  // eligibility extractor on longer sentences ("Can Driveco Motors sell EW
  // Retail Wearable Parts?"). If the LLM gave us nothing useful, recover
  // what we can from the raw text WITHOUT changing the routed tool.
  if (tool === 'checkEligibility'
      && !normalized.arguments?.dealerId
      && !normalized.arguments?.dealerName) {
    const regex = detectEligibilityIntent(content);
    if (regex && regex.tool === 'checkEligibility' && regex.arguments) {
      normalized.arguments = {
        ...regex.arguments,
        ...normalized.arguments,
        // Prefer regex-extracted dealer if LLM missed it
        dealerId: normalized.arguments?.dealerId ?? regex.arguments.dealerId,
        dealerName: normalized.arguments?.dealerName ?? regex.arguments.dealerName,
        productId: normalized.arguments?.productId ?? regex.arguments.productId,
        programId: normalized.arguments?.programId ?? regex.arguments.programId,
        programName: normalized.arguments?.programName ?? regex.arguments.programName,
      };
    }
  }

  // Anti-hallucination guard: strip productId when the user didn't literally
  // type a known product code. The extractor prompt forbids inference, but
  // small local models still sometimes invent one (e.g. emitting "DW" for
  // "Can BC006642 sell Retail Wearable Parts?"). Match as a whole word so
  // "DW" inside a longer token doesn't count.
  if (normalized.arguments?.productId) {
    const claimed = normalized.arguments.productId.trim().toUpperCase();
    const KNOWN_PRODUCT_CODES = ['EW', 'DW', 'GAP', 'RW', 'PPM', 'TR'];
    // Whole-word, case-insensitive check WITHOUT building a regex from
    // untrusted input. Scan the uppercased message for the literal code
    // bounded by non-alphanumeric characters.
    const upperContent = content.toUpperCase();
    let appearsLiterally = false;
    if (KNOWN_PRODUCT_CODES.includes(claimed)) {
      let idx = upperContent.indexOf(claimed);
      while (idx !== -1) {
        const before = idx === 0 ? ' ' : upperContent[idx - 1];
        const after = idx + claimed.length >= upperContent.length
          ? ' '
          : upperContent[idx + claimed.length];
        const isBoundary = (c: string) => !/[A-Z0-9]/.test(c);
        if (isBoundary(before) && isBoundary(after)) {
          appearsLiterally = true;
          break;
        }
        idx = upperContent.indexOf(claimed, idx + 1);
      }
    }
    if (!appearsLiterally) {
      console.log('[extractArgsForTool] stripping hallucinated productId=%o (not literally in message)', claimed);
      const { productId: _stripped, ...rest } = normalized.arguments;
      void _stripped;
      normalized.arguments = rest;
    }
  }

  return normalized;
}

async function askOllamaForToolCall(content: string): Promise<AgentToolCall> {
  const tool = await classifyTool(content);
  return extractArgsForTool(tool, content);
}
// ---------- End two-stage LLM routing ----------

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

async function searchPrograms(query: string): Promise<ProgramLookupResult[]> {
  const q = (query ?? '').trim();
  if (!q) return [];
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/programs/search?q=${encodeURIComponent(q)}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Program Search Error: ${response.status} - ${errorText}`);
  }

  return await response.json() as ProgramLookupResult[];
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

async function checkCancellationEligibility(
  contractId: string,
  params: CancellationEligibilityParams = {},
): Promise<CancellationEligibilityResult> {
  const search = new URLSearchParams();
  if (params.cancDt) search.set('cancDt', params.cancDt);
  if (params.ruleId) search.set('ruleId', params.ruleId);
  if (params.cancType) search.set('cancType', params.cancType);
  if (params.lang) search.set('lang', params.lang);
  if (params.userId) search.set('userId', params.userId);
  const qs = search.toString();

  const response = await authorizedFetch(
    `${CONTRACT_API_BASE_URL}/api/contracts/${encodeURIComponent(contractId)}/cancellation-eligibility${qs ? `?${qs}` : ''}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cancellation Check Error: ${response.status} - ${errorText}`);
  }

  return await response.json() as CancellationEligibilityResult;
}

function formatCancellationResult(result: CancellationEligibilityResult): string {
  if (result.isEligible) {
    const refundDisplay = result.refundAmount != null
      ? `${result.refundType} ($${result.refundAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
      : result.refundType;
    const lines = [
      t('cancelEligibleHeader'),
      ``,
      `${t('fieldContract')} ${result.contractNumber}`,
      `${t('fieldStatus')} ${result.status}`,
      `${t('fieldProduct')} ${result.product}`,
      `${t('fieldEffectiveExpiry')} ${result.effectiveDate} — ${t('fieldExpiry')} ${result.expiryDate}`,
      `${t('fieldRefund')} ${refundDisplay}`,
      ``,
      result.reason,
    ];
    return lines.join('\n');
  }

  return [
    t('cancelNotEligibleHeader'),
    ``,
    `${t('fieldContract')} ${result.contractNumber}`,
    `${t('fieldStatus')} ${result.status}`,
    `${t('fieldReason')} ${result.reason}`,
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
    return `${t('programNotFound')}\n\n${result.summary}`;
  }

  if (result.maxMarkup === 0 && result.summary.includes('No markup records')) {
    return [
      t('noMarkupData'),
      ``,
      `${t('fieldProgram')} ${result.programId} (${result.programName})`,
      t('noMarkupRecords'),
    ].join('\n');
  }

  return [
    t('maxMarkupHeader'),
    ``,
    `${t('fieldProgram')} ${result.programId} (${result.programName})`,
    `${t('fieldMaxMarkup')} ${result.maxMarkup.toFixed(2)}`,
  ].join('\n');
}

function formatContractStatus(status: ContractStatus): string {
  return [
    `${t('contractWord')} ${status.contractId} ${t('contractIsCurrently')} ${status.status}.`,
    `${t('owner')}: ${status.owner}.`,
    `${t('product')}: ${status.product}.`,
    `${t('effectiveDate')}: ${status.effectiveDate}.`,
    `${t('lastUpdated')}: ${new Date(status.lastUpdated).toLocaleString()}.`,
    `${t('source')}: ${status.source}.`,
  ].join('\n');
}

async function fetchEligibility(args: AgentToolCall['arguments']): Promise<EligibilityResult> {
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

async function checkEligibility(
  args: AgentToolCall['arguments']
): Promise<EligibilityResult & { resolvedProgramId?: string; resolvedProgramName?: string }> {
  // When only a dealer NAME is given, resolve it to a dealer CODE first via
  // /api/dealers/search. Calling /api/eligibility with a dealer name can
  // return inconsistent results compared to calling it with the dealer code
  // (the name-lookup path on the backend behaves differently — e.g.
  // "Driveco Motors" returns "not activated" while BC006642 returns "Eligible"
  // for the same dealer). Resolving here guarantees the same answer in both
  // forms.
  const resolved: AgentToolCall['arguments'] = { ...args };
  if (!resolved?.dealerId && resolved?.dealerName) {
    try {
      const matches = await searchDealers(resolved.dealerName);
      if (matches.length === 1) {
        resolved.dealerId = matches[0].dealerId;
        resolved.dealerName = matches[0].dbaName;
      } else if (matches.length > 1) {
        // Prefer an exact (case-insensitive) name match if one exists.
        const needle = resolved.dealerName.trim().toLowerCase();
        const exact = matches.find(m => m.dbaName?.toLowerCase() === needle);
        if (exact) {
          resolved.dealerId = exact.dealerId;
          resolved.dealerName = exact.dbaName;
        }
        // Otherwise leave dealerName as-is and let the backend pick.
      }
    } catch {
      // If dealer search fails, fall through with the name only.
    }
  }

  // Look up the program via /api/programs/search whenever we have a
  // program reference but no concrete programId. This serves two purposes:
  //   1. When neither productId nor productName is set, it resolves which
  //      product owns the program (the backend's eligibility endpoint can
  //      otherwise pick the wrong product when a program name is ambiguous,
  //      e.g. "Retail Wearable Parts").
  //   2. When productId IS known (e.g. extractor parsed "EW Retail Wearable
  //      Parts" → productId="EW", programName="Retail Wearable Parts"), we
  //      still need the actual programId so downstream activate / deactivate
  //      flows POST a real program code instead of the product code.
  //
  // Strategy:
  //   - 1 unique candidate productId → set it and call eligibility once.
  //   - N unique candidate productIds → probe eligibility for each; return
  //     the first Eligible response (matches the dealer's actual enrollment).
  //     If none are eligible, return the last response so the caller still
  //     gets a coherent "not activated" message.
  if (resolved
      && (resolved.programName || resolved.programId)
      && !(resolved.productId && resolved.programId)) {
    const lookup = (resolved.programId ?? resolved.programName)!.trim();
    if (lookup) {
      try {
        let programs = await searchPrograms(lookup);
        console.log('[checkEligibility] searchPrograms(%o) →', lookup, programs);
        // If a product is already known, restrict candidates to that
        // product so we don't accidentally jump to another product family.
        if (resolved.productId) {
          const knownProduct = resolved.productId.toLowerCase();
          const before = programs.length;
          programs = programs.filter(p => p.productId?.toLowerCase() === knownProduct);
          console.log('[checkEligibility] filtered by productId=%o: %d → %d', resolved.productId, before, programs.length);
        }
        if (programs.length > 0) {
          const needle = lookup.toLowerCase();
          // Group candidates by unique productId, preserving sort order.
          const byProduct = new Map<string, ProgramLookupResult>();
          for (const p of programs) {
            if (!p.productId) continue;
            // Prefer an exact program-name/id match within each product group.
            const existing = byProduct.get(p.productId);
            const isExact = p.programName?.toLowerCase() === needle
                          || p.programId?.toLowerCase() === needle;
            const existingExact = existing
              && (existing.programName?.toLowerCase() === needle
                  || existing.programId?.toLowerCase() === needle);
            if (!existing || (isExact && !existingExact)) {
              byProduct.set(p.productId, p);
            }
          }
          const candidates = Array.from(byProduct.values());

          if (candidates.length === 1) {
            const pick = candidates[0];
            resolved.productId = pick.productId;
            if (pick.programId) resolved.programId = pick.programId;
            if (pick.programName) resolved.programName = pick.programName;
          } else if (candidates.length > 1) {
            // Probe each candidate productId. Return the first Eligible
            // response, otherwise the final response.
            let lastResult: EligibilityResult | null = null;
            let lastProbe: AgentToolCall['arguments'] | null = null;
            for (const pick of candidates) {
              const probe: AgentToolCall['arguments'] = {
                ...resolved,
                productId: pick.productId,
                programId: pick.programId || undefined,
                programName: pick.programName || resolved.programName,
              };
              try {
                const result = await fetchEligibility(probe);
                lastResult = result;
                lastProbe = probe;
                if (result.isEligible) {
                  return {
                    ...result,
                    resolvedProgramId: probe?.programId,
                    resolvedProgramName: probe?.programName,
                  };
                }
              } catch {
                // Skip this candidate on error; continue probing.
              }
            }
            if (lastResult) {
              return {
                ...lastResult,
                resolvedProgramId: lastProbe?.programId,
                resolvedProgramName: lastProbe?.programName,
              };
            }
            // If every probe threw, fall through to single call below.
          }
        }
      } catch {
        // Fall through with the original program/product name.
      }
    }
  }

  const result = await fetchEligibility(resolved);
  console.log('[checkEligibility] resolved args →', resolved, 'eligibility →', result);
  return {
    ...result,
    resolvedProgramId: resolved?.programId,
    resolvedProgramName: resolved?.programName,
  };
}

async function activateProgram(
  dealerId: string,
  programId: string,
  effectiveDate?: string,
  productId?: string,
): Promise<ProgramActionResult> {
  const response = await authorizedFetch(`${CONTRACT_API_BASE_URL}/api/eligibility/activate`, {
    method: 'POST',
    body: JSON.stringify({ dealerId, productId, programId, effectiveDate }),
  });

  const result = await response.json() as ProgramActionResult;
  return result;
}

async function deactivateProgram(
  dealerId: string,
  programId: string,
  expiryDate: string,
  productId?: string,
): Promise<ProgramActionResult> {
  const response = await authorizedFetch(`${CONTRACT_API_BASE_URL}/api/eligibility/deactivate`, {
    method: 'POST',
    body: JSON.stringify({ dealerId, productId, programId, expiryDate }),
  });

  const result = await response.json() as ProgramActionResult;
  return result;
}

function formatEligibilityResult(result: EligibilityResult): string {
  if (result.isEligible) {
    return t('yesEligible');
  }

  const s = result.summary.toLowerCase();
  if (s.includes('suspended')) return t('noEligibleSuspended');
  if (s.includes('inactive')) return t('noEligibleInactive');
  if (s.includes('expired')) return t('noEligibleExpired');
  if (s.includes('not found')) return t('noEligibleDealerNotFound');
  if (s.includes('discontinued')) return t('noEligibleDiscontinued');
  if (s.includes('not activated')) return t('noEligibleNotActivated');
  return t('noEligibleNotSet');
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
  const lang = currentLanguage;
  return chatWithOllama([
    {
      role: 'system',
      content: `You are Team PnC, a concise BackOffice demo assistant.
Answer simple general questions directly in ${languageName(lang)}.
The current date is ${new Date().toLocaleDateString()}.
If the user asks about contract status, ask them for a contract id or tell them to use a question like: What is the status of contract AUMU02522380?
Do not claim to access backend systems unless a tool result is provided.`,
    },
    { role: 'user', content },
  ]);
}

let lastMeaningfulMessage = '';
// `product` is the product code (e.g. "EW"); `programId`/`programName`
// carry the actual program (e.g. "EWXX001" / "Retail Wearable Parts") that
// was resolved during the most recent eligibility check, so follow-up
// activate / deactivate calls can post the correct programId to the API.
let lastEligibilityContext: {
  dealerCode: string;
  product: string;
  programId?: string;
  programName?: string;
} | null = null;
let pendingDeactivation: {
  dealerCode: string;
  product: string;
  programId?: string;
  programName?: string;
} | null = null;
// When the most recent assistant message confirmed a contract is eligible
// for cancellation, we stash the result here. A follow-up "yes" / "cancel"
// from the user (typed or via the suggestion chip) then opens the
// cancellation page in the main panel.
let lastCancellationContext: CancellationEligibilityResult | null = null;

/** Pick the best programId to send to the activate/deactivate endpoint. */
function resolveProgramIdFromContext(
  ctx: { product: string; programId?: string }
): string {
  return ctx.programId && ctx.programId.trim() ? ctx.programId : ctx.product;
}

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

export interface DashboardMetrics {
  dealers: number;
  products: number;
  programs: number;
  contracts: number;
  customers: number;
  vehicles: number;
}

async function getCountFromEndpoint(endpoint: string): Promise<number> {
  const result = await fetchApi<{ count: number }>(endpoint);
  return result?.count ?? 0;
}

async function getUnifiDashboardMetrics(): Promise<DashboardMetrics> {
  const [dealers, products, programs, contracts, customers, vehicles] = await Promise.all([
    getCountFromEndpoint('/api/dashboard/active-dealers'),
    getCountFromEndpoint('/api/dashboard/products'),
    getCountFromEndpoint('/api/dashboard/active-programs'),
    getCountFromEndpoint('/api/dashboard/active-contracts'),
    getCountFromEndpoint('/api/dashboard/active-customers'),
    getCountFromEndpoint('/api/dashboard/active-vehicles'),
  ]);
  return { dealers, products, programs, contracts, customers, vehicles };
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

  // Cancellation calc / eligibility (calls DPP_DP612ContractCancel_Calc on the server)
  getCancellationEligibility: (contractNum: string, params?: CancellationEligibilityParams) =>
    checkCancellationEligibility(contractNum, params),

  // Dashboard metrics (Unifi system)
  getUnifiDashboardMetrics: () => getUnifiDashboardMetrics(),

  // Clear conversational memory of the local Ollama agent (new chat).
  resetLocalAgentState: () => {
    lastMeaningfulMessage = '';
    lastEligibilityContext = null;
    pendingDeactivation = null;
    lastCancellationContext = null;
    currentLanguage = 'en';
  },

  sendLocalAgentMessage: async (content: string): Promise<MessageDto> => {
    // Detect language of THIS user message and stash it for downstream
    // formatters and LLM prompts.
    currentLanguage = detectLanguage(content);

    // Handle pending cancellation confirmation: if the most recent assistant
    // message confirmed the contract is eligible for cancellation and the
    // user replies "yes" / "cancel" / "annuler", hand off to the host UI by
    // attaching the cancellation result to the response. "no" / "not now"
    // simply clears the pending context.
    if (lastCancellationContext) {
      const trimmed = content.trim();
      if (/^(yes|y|cancel|cancel it|cancel contract|proceed|confirm|do it|go ahead|ok|okay|oui|annuler|annuler le contrat|continuer|confirmer)$/i.test(trimmed)) {
        const ctx = lastCancellationContext;
        lastCancellationContext = null;
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: t('cancelOpeningPage'),
          timestamp: new Date().toISOString(),
          cancellationResult: ctx,
        };
      }
      if (/^(no|n|not now|cancel that|skip|nope|non|pas maintenant|annuler ça)$/i.test(trimmed)) {
        lastCancellationContext = null;
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: t('cancelDeclined'),
          timestamp: new Date().toISOString(),
        };
      }
      // Any other message: drop the pending context and fall through to the
      // normal routing flow.
      lastCancellationContext = null;
    }

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
        const result = await deactivateProgram(ctx.dealerCode, resolveProgramIdFromContext(ctx), expiryDate, ctx.product);
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: result.success
            ? `${t('deactivationSuccess')}\n\n${t('fieldDealer')} ${result.dealerCode} (${result.dealerName})\n${t('fieldProgram')} ${result.programId} (${result.programName})\n${t('fieldExpiryDate')} ${result.effectiveDate}\n\n${result.summary}`
            : `${t('deactivationFailed')}\n\n${result.summary}`,
          timestamp: new Date().toISOString(),
        };
      }

      if (expiryResponse && expiryResponse.type === 'future') {
        // Keep pendingDeactivation so next message can provide the date
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: t('pleaseProvideExpiryFmt'),
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
      const result = await deactivateProgram(ctx.dealerCode, resolveProgramIdFromContext(ctx), deactivateWithDate[1], ctx.product);
      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: result.success
          ? `${t('deactivationSuccess')}\n\n${t('fieldDealer')} ${result.dealerCode} (${result.dealerName})\n${t('fieldProgram')} ${result.programId} (${result.programName})\n${t('fieldExpiryDate')} ${result.effectiveDate}\n\n${result.summary}`
          : `${t('deactivationFailed')}\n\n${result.summary}`,
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
        content: `${t('aboutToDeactivate')} **${lastEligibilityContext.product}** ${t('forDealer')} **${lastEligibilityContext.dealerCode}**.\n\n${t('expiryTodayOrFuture')}`,
        timestamp: new Date().toISOString(),
        suggestions: [
          { label: t('labelToday'), action: 'today' },
          { label: t('labelFutureDate'), action: 'future date' },
        ],
      };
    }

    // Handle activate action (button click or typed)
    if (/^(activate|active|yes.*activate|set up|setup)$/i.test(content.trim()) && lastEligibilityContext) {
      const ctx = lastEligibilityContext;
      // Prefer the resolved programId from the last eligibility check; fall
      // back to the product code only if no program was resolved (some legacy
      // contexts).
      const programIdToUse = resolveProgramIdFromContext(ctx);
      console.log('[activate] lastEligibilityContext →', ctx, 'programIdToUse →', programIdToUse);
      const result = await activateProgram(ctx.dealerCode, programIdToUse, undefined, ctx.product);
      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: result.success
          ? `${t('activationSuccess')}\n\n${t('fieldDealer')} ${result.dealerCode} (${result.dealerName})\n${t('fieldProgram')} ${result.programId} (${result.programName})\n${t('effective')} ${result.effectiveDate}\n\n${result.summary}`
          : `${t('activationFailed')}\n\n${result.summary}`,
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
      const eligibility = await checkEligibility({
        dealerId: newDealerCode,
        productId: lastEligibilityContext.product,
        programId: lastEligibilityContext.programId,
        programName: lastEligibilityContext.programName,
      });
      lastEligibilityContext = {
        dealerCode: eligibility.dealerCode || newDealerCode,
        product: eligibility.productId ?? eligibility.product ?? lastEligibilityContext.product,
        programId: eligibility.programId
          ?? eligibility.programs?.[0]?.code
          ?? eligibility.resolvedProgramId
          ?? lastEligibilityContext.programId,
        programName: eligibility.programName
          ?? eligibility.programs?.[0]?.name
          ?? eligibility.resolvedProgramName
          ?? lastEligibilityContext.programName,
      };
      const dealerNotFound = eligibility.summary.toLowerCase().includes('not found');
      const suggestions: SuggestedAction[] = eligibility.isEligible
        ? [{ label: t('labelDeactivate'), action: 'deactivate', payload: `${eligibility.dealerCode}|${eligibility.product}` }]
        : (eligibility.dealerCode && !dealerNotFound)
          ? [{ label: t('labelActivateProduct'), action: 'activate', payload: `${eligibility.dealerCode}|${eligibility.product}` },
             { label: t('labelViewDealerDetails'), action: 'viewDealer', payload: eligibility.dealerCode }]
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

    // Use the local LLM (two-stage: classify tool, then extract entities) to
    // decide which API to call. If the LLM is completely unreachable, fall
    // back to a regex eligibility heuristic so the demo still answers.
    let toolCall: AgentToolCall;
    try {
      toolCall = await askOllamaForToolCall(effectiveContent);
    } catch {
      toolCall = detectEligibilityIntent(effectiveContent) ?? { tool: 'none', answer: t('couldNotProcess') };
    }

    // Follow-up: a bare dealer code after a previous eligibility check should
    // re-run that check for the new dealer, even if the LLM classified it as
    // generalChat / none. This is the only conversational state we keep.
    if ((toolCall.tool === 'none' || toolCall.tool === 'generalChat') && lastEligibilityContext && followUpDealerMatch) {
      const newDealerCode = followUpDealerMatch[1].toUpperCase();
      const eligibility = await checkEligibility({
        dealerId: newDealerCode,
        productId: lastEligibilityContext.product,
        programId: lastEligibilityContext.programId,
        programName: lastEligibilityContext.programName,
      });
      lastEligibilityContext = {
        dealerCode: eligibility.dealerCode || newDealerCode,
        product: eligibility.productId ?? eligibility.product ?? lastEligibilityContext.product,
        programId: eligibility.programId
          ?? eligibility.programs?.[0]?.code
          ?? eligibility.resolvedProgramId
          ?? lastEligibilityContext.programId,
        programName: eligibility.programName
          ?? eligibility.programs?.[0]?.name
          ?? eligibility.resolvedProgramName
          ?? lastEligibilityContext.programName,
      };
      const dealerNotFound = eligibility.summary.toLowerCase().includes('not found');
      const suggestions: SuggestedAction[] = eligibility.isEligible
        ? [{ label: t('labelDeactivate'), action: 'deactivate', payload: `${eligibility.dealerCode}|${eligibility.product}` }]
        : (eligibility.dealerCode && !dealerNotFound)
          ? [{ label: t('labelActivateProduct'), action: 'activate', payload: `${eligibility.dealerCode}|${eligibility.product}` },
             { label: t('labelViewDealerDetails'), action: 'viewDealer', payload: eligibility.dealerCode }]
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

    if (toolCall.tool === 'getContractStatus') {
      const contractId = toolCall.arguments?.contractId?.trim();

      if (!contractId) {
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: t('pleaseProvideContractId'),
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
          content: t('pleaseProvideContractCancel'),
          timestamp: new Date().toISOString(),
        };
      }

      const result = await checkCancellationEligibility(contractId);

      // Track context only when eligible so a follow-up "yes" / "cancel"
      // can open the cancellation page. Clear any stale context otherwise.
      lastCancellationContext = result.isEligible ? result : null;

      const baseContent = formatCancellationResult(result);
      const content = result.isEligible
        ? `${baseContent}\n\n${t('cancelPromptQuestion')}`
        : baseContent;

      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        suggestions: result.isEligible
          ? [
              { label: t('labelCancelContract'), action: 'cancel' },
              { label: t('labelNotNow'), action: 'no' },
            ]
          : undefined,
      };
    }

    if (toolCall.tool === 'getMaxMarkup') {
      const identifier = toolCall.arguments?.programId?.trim() || toolCall.arguments?.programName?.trim();

      if (!identifier) {
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: t('pleaseProvideProgramMarkup'),
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
          content: `${t('noDealersFound')} "${query}".`,
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
          content: `${t('foundDealer')} **${details.dbaName}** (${details.dealerId}).`,
          timestamp: new Date().toISOString(),
          dealerDetails: details,
        };
      }

      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: `${t('foundDealers')} ${results.length} ${t('dealersMatching')} "${query}".`,
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
          content: t('pleaseProvideDealerEligib'),
          timestamp: new Date().toISOString(),
        };
      }

      const eligibility = await checkEligibility(args);
      console.log('[checkEligibility tool] args →', args, 'eligibility →', eligibility);

      // Use the API summary to determine if actions are appropriate
      const dealerNotFound = eligibility.summary.toLowerCase().includes('not found');

      // Save context for activate / deactivate follow-ups. Capture the
      // resolved programId (preferring the dealer's enrolled program from
      // eligibility.programs[0], otherwise the program we just looked up)
      // so the typed "activate" / "deactivate" flow posts the correct code
      // — not the product code like "EW". Skip saving when the dealer
      // wasn't found so stale context isn't carried forward.
      if (eligibility.dealerCode && !dealerNotFound) {
        lastEligibilityContext = {
          dealerCode: eligibility.dealerCode,
          product: eligibility.productId ?? eligibility.product,
          programId: eligibility.programId
            ?? eligibility.programs?.[0]?.code
            ?? eligibility.resolvedProgramId,
          programName: eligibility.programName
            ?? eligibility.programs?.[0]?.name
            ?? eligibility.resolvedProgramName,
        };
        console.log('[checkEligibility tool] saved lastEligibilityContext →', lastEligibilityContext);
      }

      const suggestions: SuggestedAction[] = eligibility.isEligible
        ? [
            { label: t('labelDeactivate'), action: 'deactivate', payload: `${eligibility.dealerCode}|${eligibility.product}` },
          ]
        : (eligibility.dealerCode && !dealerNotFound)
          ? [
              { label: t('labelActivateProduct'), action: 'activate', payload: `${eligibility.dealerCode}|${eligibility.product}` },
              { label: t('labelViewDealerDetails'), action: 'viewDealer', payload: eligibility.dealerCode },
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
          content: t('pleaseProvideDealerActiv'),
          timestamp: new Date().toISOString(),
        };
      }
      if (!args?.programId) {
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: t('pleaseProvideProgramActiv'),
          timestamp: new Date().toISOString(),
        };
      }

      const result = await activateProgram(args.dealerId, args.programId, args.effectiveDate, args.productId);
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
          content: t('pleaseProvideDealerDeact'),
          timestamp: new Date().toISOString(),
        };
      }
      if (!args?.programId) {
        return {
          id: createId('local-assistant'),
          conversationId: 'local-ollama-demo',
          role: 'assistant',
          content: t('pleaseProvideProgramDeact'),
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
          content: `${t('aboutToDeactivateProg')} **${args.programId}** ${t('forDealer')} **${args.dealerId}**.\n\n${t('expiryTodayOrFuture')}`,
          timestamp: new Date().toISOString(),
          suggestions: [
            { label: t('labelToday'), action: 'today' },
            { label: t('labelFutureDate'), action: 'future date' },
          ],
        };
      }

      const result = await deactivateProgram(args.dealerId, args.programId, args.expiryDate, args.productId);
      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: result.success
          ? `${t('deactivationSuccess')}\n\n${t('fieldDealer')} ${result.dealerCode} (${result.dealerName})\n${t('fieldProgram')} ${result.programId} (${result.programName})\n${t('fieldExpiryDate')} ${result.effectiveDate}\n\n${result.summary}`
          : `${t('deactivationFailed')}\n\n${result.summary}`,
        timestamp: new Date().toISOString(),
      };
    }

    if (toolCall.tool === 'none') {
      return {
        id: createId('local-assistant'),
        conversationId: 'local-ollama-demo',
        role: 'assistant',
        content: toolCall.answer || t('pleaseProvideMoreDetails'),
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
  addSupportTicketComment: (id: string, text: string, authorName: string, email: string) => {
    // Backend expects [FromForm] AddCommentForm (multipart), not JSON.
    const formData = new FormData();
    formData.append('text', text);
    formData.append('authorName', authorName);
    formData.append('email', email);
    return fetchApi<SupportTicket>(`/api/SupportTickets/${id}/comments`, {
      method: 'POST',
      body: formData,
    });
  },
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
