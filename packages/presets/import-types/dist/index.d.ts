import { Types } from '@graphql-codegen/plugin-helpers';
import { FragmentDefinitionNode } from 'graphql';
export declare type ImportTypesConfig = {
  /**
   * @description Required, should point to the base schema types file.
   * The key of the output is used a the base path for this file.
   *
   * @exampleMarkdown
   * ```yml
   * generates:
   * path/to/file.ts:
   *  preset: import-types
   *  presetConfig:
   *    typesPath: types.ts
   *  plugins:
   *    - typescript-operations
   * ```
   */
  typesPath: string;
  /**
   * @description Optional, override the name of the import namespace used to import from the `baseTypesPath` file.
   * @default Types
   *
   * @exampleMarkdown
   * ```yml
   * generates:
   * src/:
   *  preset: import-types
   *  presetConfig:
   *    typesPath: types.ts
   *    importTypesNamespace: SchemaTypes
   *  plugins:
   *    - typescript-operations
   * ```
   */
  importTypesNamespace?: string;
};
export declare type FragmentNameToFile = {
  [fragmentName: string]: {
    location: string;
    importName: string;
    onType: string;
    node: FragmentDefinitionNode;
  };
};
export declare const preset: Types.OutputPreset<ImportTypesConfig>;
export default preset;
