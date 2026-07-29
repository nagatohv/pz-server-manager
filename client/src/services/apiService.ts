import {
  API_AUTH_LOGIN,
  API_STATUS,
  API_CONTROL,
  API_BRANCHES,
  API_INSTANCES,
  API_CONFIG_SETTINGS,
  API_CONFIG_PANEL,
  API_CONFIG_PARSED,
  API_CONFIG_RAW
} from '../config/constants.js';
import { CLIENT_STRINGS } from '../config/strings.js';
import {
  AuthResponse, BranchInfo, BranchCatalogSource, InstanceRegistry, PzInstance, ServerStatusPayload, IniSettingItem, PanelConfig, PzBackup
} from '../types.js';

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

  static async getIniSettings(token: string, instanceId?: string): Promise<IniSettingItem[]> {
    const url = instanceId ? `/api/instances/${encodeURIComponent(instanceId)}/config/settings` : API_CONFIG_SETTINGS;
    const data = await this.getJson<Record<string, string> | IniSettingItem[]>(url, token);
    if (Array.isArray(data)) return data;
    return Object.entries(data ?? {}).map(([key, value]) => ({ key, value: String(value), description: '' }));
  }

  static async saveIniSettings(token: string, settings: Record<string, string>, instanceId?: string): Promise<void> {
    const url = instanceId ? `/api/instances/${encodeURIComponent(instanceId)}/config/settings` : API_CONFIG_SETTINGS;
    return this.postJson(url, token, settings);
  }

  static async getPanelConfig(token: string, instanceId?: string): Promise<PanelConfig> {
    const url = instanceId ? `/api/instances/${encodeURIComponent(instanceId)}/config/panel` : API_CONFIG_PANEL;
    return this.getJson<PanelConfig>(url, token);
  }

  static async savePanelConfig(token: string, config: PanelConfig, instanceId?: string): Promise<void> {
    const url = instanceId ? `/api/instances/${encodeURIComponent(instanceId)}/config/panel` : API_CONFIG_PANEL;
    return this.postJson(url, token, config);
  }

  static async getParsedConfig(token: string, type: string, instanceId?: string): Promise<unknown> {
    const baseUrl = instanceId ? `/api/instances/${encodeURIComponent(instanceId)}/config/parsed` : API_CONFIG_PARSED;
    const res = await this.getJson<{ data: unknown }>(`${baseUrl}/${type}`, token);
    return res.data;
  }

  static async saveParsedConfig(token: string, type: string, data: unknown, instanceId?: string): Promise<void> {
    const baseUrl = instanceId ? `/api/instances/${encodeURIComponent(instanceId)}/config/parsed` : API_CONFIG_PARSED;
    return this.postJson(`${baseUrl}/${type}`, token, { data });
  }

  static async getRawConfig(token: string, type: string, instanceId?: string): Promise<string> {
    const baseUrl = instanceId ? `/api/instances/${encodeURIComponent(instanceId)}/config/raw` : API_CONFIG_RAW;
    const res = await this.getJson<{ content: string }>(`${baseUrl}/${type}`, token);
    return res.content ?? '';
  }

  static async saveRawConfig(token: string, type: string, text: string, instanceId?: string): Promise<void> {
    const baseUrl = instanceId ? `/api/instances/${encodeURIComponent(instanceId)}/config/raw` : API_CONFIG_RAW;
    const res = await fetch(`${baseUrl}/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': CONTENT_TYPE_JSON,
        ...buildAuthHeaders(token)
      },
      body: JSON.stringify({ content: text })
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

  static async getBranchCatalogSnapshot(token: string): Promise<{
    branches: BranchInfo[];
    isLoading: boolean;
    error: string | null;
    fetchedAt: number | null;
    source: BranchCatalogSource;
  }> {
    const data = await this.getJson<{
      branches?: BranchInfo[];
      isLoading?: boolean;
      error?: string | null;
      fetchedAt?: number | null;
      source?: BranchCatalogSource;
    }>(API_BRANCHES, token);
    return {
      branches: Array.isArray(data?.branches) ? data.branches : [],
      isLoading: data?.isLoading ?? false,
      error: data?.error ?? null,
      fetchedAt: data?.fetchedAt ?? null,
      source: data?.source ?? 'steam'
    };
  }

  static async listInstances(token: string): Promise<InstanceRegistry> {
    return this.getJson<InstanceRegistry>(API_INSTANCES, token);
  }

  static async createInstance(token: string, payload: {
    name: string;
    branch: string;
    gamePort: number;
    rconPort: number;
    maxPlayers: number;
  }): Promise<{ instance: PzInstance }> {
    return this.postJson(`${API_INSTANCES}`, token, payload);
  }

  static async selectInstance(token: string, id: string): Promise<{ instance: PzInstance }> {
    return this.postJson(`${API_INSTANCES}/${encodeURIComponent(id)}/select`, token, {});
  }

  static async installInstance(token: string, id: string): Promise<{ instance: PzInstance; success: boolean }> {
    return this.postJson(`${API_INSTANCES}/${encodeURIComponent(id)}/install`, token, {});
  }

  static async deleteInstance(token: string, id: string): Promise<{ success: boolean }> {
    return this.deleteJson(`${API_INSTANCES}/${encodeURIComponent(id)}`, token);
  }

  static async migrateInstance(token: string, targetId: string, sourceId: string): Promise<{
    sourceId: string;
    targetId: string;
    filesCopied: number;
    bytesCopied: number;
  }> {
    return this.postJson(`${API_INSTANCES}/${encodeURIComponent(targetId)}/migrate`, token, { sourceId });
  }

  static async getBackups(token: string, instanceId: string): Promise<PzBackup[]> {
    return this.getJson<PzBackup[]>(`/api/instances/${encodeURIComponent(instanceId)}/backups`, token);
  }

  static async createBackup(token: string, instanceId: string, note?: string): Promise<PzBackup> {
    return this.postJson<PzBackup>(`/api/instances/${encodeURIComponent(instanceId)}/backups`, token, { note });
  }

  static async restoreBackup(token: string, instanceId: string, backupId: string): Promise<{ restoredAt: number; filesRestored: number }> {
    return this.postJson<{ restoredAt: number; filesRestored: number }>(`/api/instances/${encodeURIComponent(instanceId)}/backups/${encodeURIComponent(backupId)}/restore`, token, {});
  }

  static async deleteBackup(token: string, instanceId: string, backupId: string): Promise<void> {
    return this.deleteJson<void>(`/api/instances/${encodeURIComponent(instanceId)}/backups/${encodeURIComponent(backupId)}`, token);
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

  private static async deleteJson<T>(url: string, token: string): Promise<T> {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: buildAuthHeaders(token)
    });
    return parseJsonResponse<T>(res);
  }
}
