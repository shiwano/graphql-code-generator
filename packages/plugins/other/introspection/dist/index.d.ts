import { PluginFunction, PluginValidateFn } from '@graphql-codegen/plugin-helpers';
/**
 * @description This plugin generates a GraphQL introspection file based on your GraphQL schema.
 */
export interface IntrospectionPluginConfig {
  /**
   * @description Set to `true` in order to minify the JSON output.
   * @default false
   *
   * @exampleMarkdown
   * ```yml
   * generates:
   * introspection.json:
   *   plugins:
   *     - introspection
   *   config:
   *     minify: true
   * ```
   */
  minify?: boolean;
  /**
   * @description Whether to include descriptions in the introspection result.
   * @default true
   */
  descriptions?: boolean;
  /**
   * @description Whether to include `specifiedByUrl` in the introspection result.
   * @default false
   */
  specifiedByUrl?: boolean;
  /**
   * @description Whether to include `isRepeatable` flag on directives.
   * @default true
   */
  directiveIsRepeatable?: boolean;
  /**
   * @description Whether to include `description` field on schema.
   * @default false
   */
  schemaDescription?: boolean;
  federation?: boolean;
}
export declare const plugin: PluginFunction<IntrospectionPluginConfig>;
export declare const validate: PluginValidateFn<any>;
