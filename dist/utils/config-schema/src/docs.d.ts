import * as TJS from 'typescript-json-schema';
import { PluginConfig, PresetConfig } from './plugins';
export declare function generateDocs(
  schema: TJS.Definition,
  types: (PluginConfig | PresetConfig)[]
): Record<string, string>;
