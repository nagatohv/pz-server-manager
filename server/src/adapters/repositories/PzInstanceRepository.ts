import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import IPzInstanceRepository from '../../domain/ports/IPzInstanceRepository.js';
import { SERVER_CONSTANTS } from '../../config/constants.js';
import { SERVER_STRINGS } from '../../config/strings.js';
import type { PzInstance, PzInstanceRegistry } from '../../types.js';

const emptyRegistry = (): PzInstanceRegistry => ({
  instances: [],
  activeInstanceId: null,
  updatedAt: Date.now()
});

/**
 * File-based implementation of {@link IPzInstanceRepository}. Stores the
 * full registry as JSON under `<DATA_DIR>/instances/registry.json` and uses
 * an atomic temp-file + rename strategy so partial writes never corrupt it.
 */
export class PzInstanceRepository implements IPzInstanceRepository {
  private readonly filePath: string;
  private readonly dirPath: string;

  constructor(dataDir: string = SERVER_CONSTANTS.DEFAULT_DATA_DIR) {
    this.dirPath = path.join(dataDir, SERVER_CONSTANTS.INSTANCES_DIR_NAME);
    this.filePath = path.join(this.dirPath, SERVER_CONSTANTS.INSTANCE_REGISTRY_FILE);
  }

  async load(): Promise<PzInstanceRegistry> {
    try {
      const raw = await fsp.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PzInstanceRegistry>;
      if (!parsed || !Array.isArray(parsed.instances)) {
        return emptyRegistry();
      }
      return {
        instances: parsed.instances,
        activeInstanceId: parsed.activeInstanceId ?? null,
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now()
      };
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
        return emptyRegistry();
      }
      return emptyRegistry();
    }
  }

  async save(registry: PzInstanceRegistry): Promise<void> {
    await fsp.mkdir(this.dirPath, { recursive: true });
    const tmpPath = `${this.filePath}.${process.pid}.tmp`;
    const payload = JSON.stringify(registry, null, 2);
    await fsp.writeFile(tmpPath, payload, 'utf8');
    await fsp.rename(tmpPath, this.filePath);
  }

  async update(mutator: (registry: PzInstanceRegistry) => PzInstanceRegistry | Promise<PzInstanceRegistry>): Promise<PzInstanceRegistry> {
    const current = await this.load();
    const next = await mutator(current);
    next.updatedAt = Date.now();
    await this.save(next);
    return next;
  }

  async findById(id: string): Promise<PzInstance | null> {
    const registry = await this.load();
    return registry.instances.find((i) => i.id === id) ?? null;
  }

  async findByName(name: string): Promise<PzInstance | null> {
    const registry = await this.load();
    return registry.instances.find((i) => i.name === name) ?? null;
  }

  async getActive(): Promise<PzInstance | null> {
    const registry = await this.load();
    if (!registry.activeInstanceId) return null;
    return registry.instances.find((i) => i.id === registry.activeInstanceId) ?? null;
  }

  /** Test seam: exposes the on-disk path of the registry file. */
  getFilePath(): string {
    return this.filePath;
  }
}

void SERVER_STRINGS;
void fs;
