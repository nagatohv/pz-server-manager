import { describe, it, expect, vi } from 'vitest';
import ManageConfigUseCase from '../usecases/ManageConfigUseCase.js';
import type IConfigRepository from '../domain/ports/IConfigRepository.js';

describe('ManageConfigUseCase', () => {
  const createMockRepo = (): IConfigRepository => ({
    readIniSettings: vi.fn().mockReturnValue([]),
    saveIniSettings: vi.fn().mockReturnValue({ success: true }),
    readPanelConfig: vi.fn().mockReturnValue({ idleShutdownMinutes: 0, serverLanguage: 'es' }),
    savePanelConfig: vi.fn().mockReturnValue({ idleShutdownMinutes: 10, serverLanguage: 'es' }),
    readRawFile: vi.fn().mockReturnValue(''),
    saveRawFile: vi.fn().mockReturnValue({ success: true })
  });

  it('should call readIniSettings on configRepository', () => {
    const mockRepo = createMockRepo();
    const useCase = new ManageConfigUseCase(mockRepo);
    useCase.getSettings();
    expect(mockRepo.readIniSettings).toHaveBeenCalled();
  });

  it('should call saveIniSettings on configRepository', () => {
    const mockRepo = createMockRepo();
    const useCase = new ManageConfigUseCase(mockRepo);
    const mockSettings = { PVP: 'false' };
    useCase.saveSettings(mockSettings);
    expect(mockRepo.saveIniSettings).toHaveBeenCalledWith(mockSettings);
  });

  it('should call readPanelConfig on configRepository', () => {
    const mockRepo = createMockRepo();
    const useCase = new ManageConfigUseCase(mockRepo);
    useCase.getPanelConfig();
    expect(mockRepo.readPanelConfig).toHaveBeenCalled();
  });

  it('should call savePanelConfig on configRepository', () => {
    const mockRepo = createMockRepo();
    const useCase = new ManageConfigUseCase(mockRepo);
    const mockConfig = { idleShutdownMinutes: 10, serverLanguage: 'es' };
    useCase.savePanelConfig(mockConfig);
    expect(mockRepo.savePanelConfig).toHaveBeenCalledWith(mockConfig);
  });

  it('should call readRawFile on configRepository', () => {
    const mockRepo = createMockRepo();
    const useCase = new ManageConfigUseCase(mockRepo);
    useCase.getRawFile('ini');
    expect(mockRepo.readRawFile).toHaveBeenCalledWith('ini');
  });

  it('should call saveRawFile on configRepository', () => {
    const mockRepo = createMockRepo();
    const useCase = new ManageConfigUseCase(mockRepo);
    useCase.saveRawFile('ini', 'raw content');
    expect(mockRepo.saveRawFile).toHaveBeenCalledWith('ini', 'raw content');
  });
});
