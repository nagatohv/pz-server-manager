import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/apiService.js';
import { CLIENT_STRINGS } from '../config/strings.js';
import {
  MOD_LIST_SEPARATOR,
  INI_KEY_MODS,
  INI_KEY_WORKSHOP_ITEMS,
  SANDBOX_PATH_SEPARATOR,
  SUCCESS_MESSAGE_TIMEOUT_MS
} from '../config/constants.js';
import {
  ModItem,
  IniSettingItem,
  PanelConfig,
  EditorType,
  EditorMode
} from '../types.js';

const DEFAULT_PANEL_CONFIG: PanelConfig = {
  idleShutdownMinutes: 0,
  serverLanguage: 'es'
};

const isAuthError = (message: string): boolean =>
  message.includes('expirada') || message.includes('autorizada');

const parseModsFromSettings = (settings: IniSettingItem[]): ModItem[] => {
  const modsValue = settings.find((s) => s.key === INI_KEY_MODS)?.value ?? '';
  const workshopValue = settings.find((s) => s.key === INI_KEY_WORKSHOP_ITEMS)?.value ?? '';

  const modIds = modsValue.split(MOD_LIST_SEPARATOR).filter(Boolean);
  const workshopIds = workshopValue.split(MOD_LIST_SEPARATOR).filter(Boolean);

  const maxLen = Math.max(modIds.length, workshopIds.length);
  return Array.from({ length: maxLen }, (_, i) => ({
    modId: modIds[i] ?? '',
    workshopId: workshopIds[i] ?? ''
  }));
};

const buildSettingsMap = (settings: IniSettingItem[]): Record<string, string> =>
  Object.fromEntries(settings.map((item) => [item.key, item.value]));

export function useConfigManager(token: string | null, onSessionExpired: () => void) {
  const [iniSettings, setIniSettings] = useState<IniSettingItem[]>([]);
  const [panelConfig, setPanelConfig] = useState<PanelConfig>(DEFAULT_PANEL_CONFIG);
  const [modsList, setModsList] = useState<ModItem[]>([]);
  const [editorType, setEditorType] = useState<EditorType>(EditorType.Ini);
  const [editorMode, setEditorMode] = useState<EditorMode>(EditorMode.Gui);
  const [parsedConfigData, setParsedConfigData] = useState<unknown>(null);
  const [rawConfigText, setRawConfigText] = useState<string>('');
  const [savedMessage, setSavedMessage] = useState<string>('');

  const showSuccess = useCallback((message: string) => {
    setSavedMessage(message);
    setTimeout(() => setSavedMessage(''), SUCCESS_MESSAGE_TIMEOUT_MS);
  }, []);

  const fetchInitialData = useCallback(async () => {
    if (!token) return;
    try {
      const [settings, config] = await Promise.all([
        ApiService.getIniSettings(token),
        ApiService.getPanelConfig(token)
      ]);
      setIniSettings(settings);
      setPanelConfig(config);
      setModsList(parseModsFromSettings(settings));
    } catch (e: unknown) {
      if (e instanceof Error && isAuthError(e.message)) onSessionExpired();
    }
  }, [token, onSessionExpired]);

  const fetchEditorData = useCallback(async () => {
    if (!token) return;
    try {
      if (editorMode === EditorMode.Gui) {
        const data = await ApiService.getParsedConfig(token, editorType);
        setParsedConfigData(data);
      } else {
        const text = await ApiService.getRawConfig(token, editorType);
        setRawConfigText(text);
      }
    } catch (e: unknown) {
      if (e instanceof Error && isAuthError(e.message)) onSessionExpired();
    }
  }, [token, editorType, editorMode, onSessionExpired]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
  useEffect(() => { fetchEditorData(); }, [fetchEditorData]);

  const updateIniSetting = useCallback((key: string, val: string) => {
    setIniSettings((prev) =>
      prev.map((item) => (item.key === key ? { ...item, value: val } : item))
    );
  }, []);

  const updatePanelConfigField = useCallback(<K extends keyof PanelConfig>(field: K, val: PanelConfig[K]) => {
    setPanelConfig((prev) => ({ ...prev, [field]: val }));
  }, []);

  const saveSettings = useCallback(async () => {
    if (!token) return;
    await Promise.all([
      ApiService.saveIniSettings(token, buildSettingsMap(iniSettings)),
      ApiService.savePanelConfig(token, panelConfig)
    ]);
    showSuccess(CLIENT_STRINGS.SETTINGS_PANEL.SUCCESS_MESSAGE);
  }, [token, iniSettings, panelConfig, showSuccess]);

  const addMod = useCallback((modId: string, workshopId: string) => {
    setModsList((prev) => [...prev, { modId, workshopId }]);
  }, []);

  const removeMod = useCallback((index: number) => {
    setModsList((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const saveMods = useCallback(async () => {
    if (!token) return;
    const modsStr = modsList.map((m) => m.modId).filter(Boolean).join(MOD_LIST_SEPARATOR);
    const workshopStr = modsList.map((m) => m.workshopId).filter(Boolean).join(MOD_LIST_SEPARATOR);

    const updatedSettings = iniSettings.map((item) => {
      if (item.key === INI_KEY_MODS) return { ...item, value: modsStr };
      if (item.key === INI_KEY_WORKSHOP_ITEMS) return { ...item, value: workshopStr };
      return item;
    });

    setIniSettings(updatedSettings);
    await ApiService.saveIniSettings(token, buildSettingsMap(updatedSettings));
    showSuccess(CLIENT_STRINGS.MODS_PANEL.SUCCESS_MESSAGE);
  }, [token, modsList, iniSettings, showSuccess]);

  const updateSandboxValue = useCallback((pathStr: string, newVal: unknown) => {
    setParsedConfigData((prev: unknown) => {
      const data = prev as { values?: Record<string, Record<string, unknown>> };
      if (!data?.values) return prev;

      const [category, key] = pathStr.split(SANDBOX_PATH_SEPARATOR);
      if (!category || !key || !data.values[category]) return prev;

      return {
        ...data,
        values: {
          ...data.values,
          [category]: {
            ...data.values[category],
            [key]: newVal
          }
        }
      };
    });
  }, []);

  const toggleSpawnRegion = useCallback((index: number) => {
    setParsedConfigData((prev: unknown) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((region, i) =>
        i === index ? { ...region, enabled: !region.enabled } : region
      );
    });
  }, []);

  const removeSpawnRegion = useCallback((index: number) => {
    setParsedConfigData((prev: unknown) => {
      if (!Array.isArray(prev)) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const saveEditor = useCallback(async () => {
    if (!token) return;
    if (editorMode === EditorMode.Raw) {
      await ApiService.saveRawConfig(token, editorType, rawConfigText);
    } else {
      await ApiService.saveParsedConfig(token, editorType, parsedConfigData);
    }

    showSuccess(
      CLIENT_STRINGS.EDITOR_PANEL.SUCCESS_MESSAGE_TEMPLATE.replace(
        '{type}',
        editorType.toUpperCase()
      )
    );
  }, [token, editorMode, editorType, rawConfigText, parsedConfigData, showSuccess]);

  return {
    iniSettings,
    panelConfig,
    modsList,
    editorType,
    setEditorType,
    editorMode,
    setEditorMode,
    parsedConfigData,
    rawConfigText,
    setRawConfigText,
    savedMessage,
    updateIniSetting,
    updatePanelConfigField,
    saveSettings,
    addMod,
    removeMod,
    saveMods,
    updateSandboxValue,
    toggleSpawnRegion,
    removeSpawnRegion,
    saveEditor
  };
}
