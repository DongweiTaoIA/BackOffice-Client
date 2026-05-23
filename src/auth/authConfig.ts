import { LogLevel } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || 'YOUR_CLIENT_ID';
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || 'YOUR_TENANT_ID';
const authority = `https://login.microsoftonline.com/${tenantId}`;
const redirectUri = import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin;
const apiClientId = import.meta.env.VITE_AZURE_API_CLIENT_ID || clientId;

const rawApiScope = import.meta.env.VITE_AZURE_API_SCOPE || 'access_as_user';
const apiScope = rawApiScope.includes('/') ? rawApiScope : `api://${apiClientId}/${rawApiScope}`;
const graphScopes = (import.meta.env.VITE_AZURE_GRAPH_SCOPES || 'https://graph.microsoft.com/User.Read')
  .split(',')
  .map((scope: string) => scope.trim())
  .filter(Boolean);

export const msalConfig = {
  auth: {
    clientId,
    authority,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    cacheLocation: 'sessionStorage' as const,
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          default:
            break;
        }
      },
      logLevel: LogLevel.Info,
      piiLoggingEnabled: false,
    },
  },
};

export const loginRequest = {
  scopes: [apiScope],
};

export const graphRequest = {
  scopes: graphScopes,
};

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
};
