import { PluginFunction } from '@graphql-codegen/plugin-helpers';
export interface NamedOperationsObjectPluginConfig {
  /**
   * @description Allow you to customize the name of the exported identifier
   * @default namedOperations
   *
   * @exampleMarkdown
   * ```yml
   * generates:
   * path/to/file.ts:
   *  plugins:
   *    - typescript
   *    - named-operations-object
   *  config:
   *    identifierName: ListAllOperations
   * ```
   */
  identifierName?: string;
  /**
   * @description Will generate a const string instead of regular string.
   * @default false
   */
  useConsts?: boolean;
}
export declare const plugin: PluginFunction<NamedOperationsObjectPluginConfig, string>;
