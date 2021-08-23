import { PluginFunction, PluginValidateFn } from '@graphql-codegen/plugin-helpers';
/**
 * @description This plugin generates an introspection file for Schema Awareness feature of Urql Cache Exchange
 *
 * You can read more about it in `urql` documentation: https://formidable.com/open-source/urql/docs/graphcache/schema-awareness/.
 *
 * Urql Introspection plugin accepts a TypeScript / JavaScript or a JSON file as an output _(`.ts, .tsx, .js, .jsx, .json`)_.
 *
 * Both in TypeScript and JavaScript a default export is being used.
 *
 * > The output is based on the output you choose for the output file name.
 */
export interface UrqlIntrospectionConfig {
  /**
   * @description Compatible only with JSON extension, allow you to choose the export type, either `module.exports` or `export default`.  Allowed values are: `commonjs`,  `es2015`.
   * @default es2015
   *
   * @exampleMarkdown
   * ```yml
   * generates:
   * path/to/file.json:
   *  plugins:
   *    - urql-introspection
   *  config:
   *    module: commonjs
   * ```
   */
  module?: 'commonjs' | 'es2015';
  /**
   * @name useTypeImports
   * @type boolean
   * @default false
   * @description Will use `import type {}` rather than `import {}` when importing only types. This gives
   * compatibility with TypeScript's "importsNotUsedAsValues": "error" option
   *
   * @example
   * ```yml
   * config:
   *   useTypeImports: true
   * ```
   */
  useTypeImports?: boolean;
  /**
   * @name includeScalars
   * @type boolean
   * @default false
   * @description Includes scalar names (instead of an `Any` replacement) in the output when enabled.
   *
   * @example
   * ```yml
   * config:
   *   includeScalars: true
   * ```
   */
  includeScalars?: boolean;
  /**
   * @name includeEnums
   * @type boolean
   * @default false
   * @description Includes enums (instead of an `Any` replacement) in the output when enabled.
   *
   * @example
   * ```yml
   * config:
   *   includeEnums: true
   * ```
   */
  includeEnums?: boolean;
  /**
   * @name includeInputs
   * @type boolean
   * @default false
   * @description Includes all input objects (instead of an `Any` replacement) in the output when enabled.
   *
   * @example
   * ```yml
   * config:
   *   includeInputs: true
   * ```
   */
  includeInputs?: boolean;
  /**
   * @name includeDirectives
   * @type boolean
   * @default false
   * @description Includes all directives in the output when enabled.
   *
   * @example
   * ```yml
   * config:
   *   includeDirectives: true
   * ```
   */
  includeDirectives?: boolean;
}
export declare const plugin: PluginFunction;
export declare const validate: PluginValidateFn<any>;
