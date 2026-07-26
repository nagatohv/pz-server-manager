import {
  API_AUTH_LOGIN,
  API_STATUS,
  API_CONTROL,
  API_CONFIG_SETTINGS,
  API_CONFIG_PANEL,
  API_CONFIG_PARSED,
  API_CONFIG_RAW
} from '../config/constants.js';
import { CLIENT_STRINGS } from '../config/strings.js';
import { AuthResponse, ServerStatusPayload, IniSettingItem, PanelConfig } from '../types.js';

const CONTENT_TYPE_JSON = 'application/json';
const CONTENT_TYPE_TEXT = 'text/plain';

const buildAuthHeaders = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`
});

const buildJsonHeaders = (token?: string): Record<string, string> => ({
  'Content-Type': CONTENT_TYPE_JSON,
  ...(token ? buildAuthHeaders(token) : {})
});

const handleAuthError = (status: number): void => {
  if (status === 401 || status === 403) {
    throw new Error(CLIENT_STRINGS.AUTH.ERR_SESSION_EXPIRED);
  }
};

const parseJsonResponse = async <T>(res: Response): Promise<T> => {
  handleAuthError(res.status);
  const data = await res.json() as T & { error?: string };
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? CLIENT_STRINGS.ERRORS.REQUEST_FAILED);
  }
  return data;
};

export class ApiService {
  static async login(password: string): Promise<AuthResponse> {
    const res = await fetch(API_AUTH_LOGIN, {
      method: 'POST',
      headers: buildJsonHeaders(),
      body: JSON.stringify({ password })
    });
    const data = await res.json() as AuthResponse & { error?: string };
    if (!res.ok) {
      throw new Error(data.error ?? CLIENT_STRINGS.AUTH.ERR_AUTH_FAILED);
    }
    return data;
  }

  static async getStatus(token: string): Promise<ServerStatusPayload> {
    return this.getJson<ServerStatusPayload>(API_STATUS, token);
  }

  static async getIniSettings(token: string): Promise<IniSettingItem[]> {
    const data = await this.getJson<Record<string, string> | IniSettingItem[]>(API_CONFIG_SETTINGS, token);
    if (Array.isArray(data)) return data;
    return Object.entries(data ?? {}).map(([key, value]) => ({ key, value: String(value), description: '' }));
  }

  static async saveIniSettings(token: string, settings: Record<string, string>): Promise<void> {
    return this.postJson(API_CONFIG_SETTINGS, token, settings);
  }

  static async getPanelConfig(token: string): Promise<PanelConfig> {
    return this.getJson<PanelConfig>(API_CONFIG_PANEL, token);
  }

  static async savePanelConfig(token: string, config: PanelConfig): Promise<void> {
    return this.postJson(API_CONFIG_PANEL, token, config);
  }

  static async getParsedConfig(token: string, type: string): Promise<unknown> {
    const res = await this.getJson<{ data: unknown }>(`${API_CONFIG_PARSED}/${type}`, token);
    return res.data;
  }

  static async saveParsedConfig(token: string, type: string, data: unknown): Promise<void> {
    return this.postJson(`${API_CONFIG_PARSED}/${type}`, token, data);
  }

  static async getRawConfig(token: string, type: string): Promise<string> {
    const res = await this.getJson<{ content: string }>(`${API_CONFIG_RAW}/${type}`, token);
    return res.content ?? '';
  }

  static async saveRawConfig(token: string, type: string, text: string): Promise<void> {
    const res = await fetch(`${API_CONFIG_RAW}/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': CONTENT_TYPE_TEXT,
        ...buildAuthHeaders(token)
      },
      body: text
    });
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      throw new Error(data.error ?? CLIENT_STRINGS.ERRORS.SAVE_FAILED);
    }
  }

  static async executeControlAction(token: string, action: string, branch?: string): Promise<void> {
    const body: Record<string, string> = { action };
    if (branch) body['branch'] = branch;
    return this.postJson(API_CONTROL, token, body);
  }

  private static async getJson<T>(url: string, token: string): Promise<T> {
    const res = await fetch(url, { headers: buildAuthHeaders(token) });
    return parseJsonResponse<T>(res);
  }

  private static async postJson<T>(url: string, token: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: buildJsonHeaders(token),
      body: JSON.stringify(body)
    });
    return parseJsonResponse<T>(res);
  }
}
