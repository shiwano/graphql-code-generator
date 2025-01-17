import {
  DirectiveDefinitionNode,
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  GraphQLSchema,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  InterfaceTypeDefinitionNode,
  ListTypeNode,
  NamedTypeNode,
  NameNode,
  NonNullTypeNode,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  UnionTypeDefinitionNode,
  StringValueNode,
  DirectiveNode,
} from 'graphql';
import { BaseVisitor, ParsedConfig, RawConfig } from './base-visitor';
import {
  EnumValuesMap,
  NormalizedScalarsMap,
  DeclarationKindConfig,
  DeclarationKind,
  ParsedEnumValuesMap,
} from './types';
import { DeclarationBlock, DeclarationBlockConfig } from './utils';
import { OperationVariablesToObject } from './variables-to-object';
export interface ParsedTypesConfig extends ParsedConfig {
  enumValues: ParsedEnumValuesMap;
  declarationKind: DeclarationKindConfig;
  addUnderscoreToArgsType: boolean;
  onlyOperationTypes: boolean;
  enumPrefix: boolean;
  fieldWrapperValue: string;
  wrapFieldDefinitions: boolean;
  entireFieldWrapperValue: string;
  wrapEntireDefinitions: boolean;
  ignoreEnumValuesFromSchema: boolean;
}
export interface RawTypesConfig extends RawConfig {
  /**
   * @description Adds `_` to generated `Args` types in order to avoid duplicate identifiers.
   *
   * @exampleMarkdown
   * ## With Custom Values
   * ```yml
   *   config:
   *     addUnderscoreToArgsType: true
   * ```
   */
  addUnderscoreToArgsType?: boolean;
  /**
   * @description Overrides the default value of enum values declared in your GraphQL schema.
   * You can also map the entire enum to an external type by providing a string that of `module#type`.
   *
   * @exampleMarkdown
   * ## With Custom Values
   * ```yml
   *   config:
   *     enumValues:
   *       MyEnum:
   *         A: 'foo'
   * ```
   *
   * ## With External Enum
   * ```yml
   *   config:
   *     enumValues:
   *       MyEnum: ./my-file#MyCustomEnum
   * ```
   *
   * ## Import All Enums from a file
   * ```yml
   *   config:
   *     enumValues: ./my-file
   * ```
   */
  enumValues?: EnumValuesMap;
  /**
   * @description Overrides the default output for various GraphQL elements.
   *
   * @exampleMarkdown
   * ## Override all declarations
   * ```yml
   *   config:
   *     declarationKind: 'interface'
   * ```
   *
   * ## Override only specific declarations
   * ```yml
   *   config:
   *     declarationKind:
   *       type: 'interface'
   *       input: 'interface'
   * ```
   */
  declarationKind?: DeclarationKind | DeclarationKindConfig;
  /**
   * @default true
   * @description Allow you to disable prefixing for generated enums, works in combination with `typesPrefix`.
   *
   * @exampleMarkdown
   * ## Disable enum prefixes
   * ```yml
   *   config:
   *     typesPrefix: I
   *     enumPrefix: false
   * ```
   */
  enumPrefix?: boolean;
  /**
   * @description Allow you to add wrapper for field type, use T as the generic value. Make sure to set `wrapFieldDefinitions` to `true` in order to make this flag work.
   * @default T
   *
   * @exampleMarkdown
   * ## Allow Promise
   * ```yml
   * generates:
   * path/to/file.ts:
   *  plugins:
   *    - typescript
   *  config:
   *    wrapFieldDefinitions: true
   *    fieldWrapperValue: T | Promise<T>
   * ```
   */
  fieldWrapperValue?: string;
  /**
   * @description Set the to `true` in order to wrap field definitions with `FieldWrapper`.
   * This is useful to allow return types such as Promises and functions.
   * @default false
   *
   * @exampleMarkdown
   * ## Enable wrapping fields
   * ```yml
   * generates:
   * path/to/file.ts:
   *  plugins:
   *    - typescript
   *  config:
   *    wrapFieldDefinitions: true
   * ```
   */
  wrapFieldDefinitions?: boolean;
  /**
   * @description This will cause the generator to emit types for operations only (basically only enums and scalars)
   * @default false
   *
   * @exampleMarkdown
   * ## Override all definition types
   * ```yml
   * generates:
   * path/to/file.ts:
   *  plugins:
   *    - typescript
   *  config:
   *    onlyOperationTypes: true
   * ```
   */
  onlyOperationTypes?: boolean;
  /**
   * @description This will cause the generator to ignore enum values defined in GraphQLSchema
   * @default false
   *
   * @exampleMarkdown
   * ## Ignore enum values from schema
   * ```yml
   * generates:
   * path/to/file.ts:
   *  plugins:
   *    - typescript
   *  config:
   *    ignoreEnumValuesFromSchema: true
   * ```
   */
  ignoreEnumValuesFromSchema?: boolean;
  /**
   * @name wrapEntireFieldDefinitions
   * @type boolean
   * @description Set the to `true` in order to wrap field definitions with `EntireFieldWrapper`.
   * This is useful to allow return types such as Promises and functions for fields.
   * Differs from `wrapFieldDefinitions` in that this wraps the entire field definition if ie. the field is an Array, while
   * `wrapFieldDefinitions` will wrap every single value inside the array.
   * @default true
   *
   * @example Enable wrapping entire fields
   * ```yml
   * generates:
   * path/to/file.ts:
   *  plugins:
   *    - typescript
   *  config:
   *    wrapEntireFieldDefinitions: false
   * ```
   */
  wrapEntireFieldDefinitions?: boolean;
  /**
   * @name entireFieldWrapperValue
   * @type string
   * @description Allow to override the type value of `EntireFieldWrapper`. This wrapper applies outside of Array and Maybe
   * unlike `fieldWrapperValue`, that will wrap the inner type.
   * @default T | Promise<T> | (() => T | Promise<T>)
   *
   * @example Only allow values
   * ```yml
   * generates:
   * path/to/file.ts:
   *  plugins:
   *    - typescript
   *  config:
   *    entireFieldWrapperValue: T
   * ```
   */
  entireFieldWrapperValue?: string;
}
export declare class BaseTypesVisitor<
  TRawConfig extends RawTypesConfig = RawTypesConfig,
  TPluginConfig extends ParsedTypesConfig = ParsedTypesConfig
> extends BaseVisitor<TRawConfig, TPluginConfig> {
  protected _schema: GraphQLSchema;
  protected _argumentsTransformer: OperationVariablesToObject;
  constructor(
    _schema: GraphQLSchema,
    rawConfig: TRawConfig,
    additionalConfig: TPluginConfig,
    defaultScalars?: NormalizedScalarsMap
  );
  protected getExportPrefix(): string;
  getFieldWrapperValue(): string;
  getEntireFieldWrapperValue(): string;
  getScalarsImports(): string[];
  get scalarsDefinition(): string;
  setDeclarationBlockConfig(config: DeclarationBlockConfig): void;
  setArgumentsTransformer(argumentsTransfomer: OperationVariablesToObject): void;
  NonNullType(node: NonNullTypeNode): string;
  getInputObjectDeclarationBlock(node: InputObjectTypeDefinitionNode): DeclarationBlock;
  InputObjectTypeDefinition(node: InputObjectTypeDefinitionNode): string;
  InputValueDefinition(node: InputValueDefinitionNode): string;
  Name(node: NameNode): string;
  FieldDefinition(node: FieldDefinitionNode): string;
  UnionTypeDefinition(node: UnionTypeDefinitionNode, key: string | number | undefined, parent: any): string;
  protected mergeInterfaces(interfaces: string[], hasOtherFields: boolean): string;
  appendInterfacesAndFieldsToBlock(block: DeclarationBlock, interfaces: string[], fields: string[]): void;
  getObjectTypeDeclarationBlock(
    node: ObjectTypeDefinitionNode,
    originalNode: ObjectTypeDefinitionNode
  ): DeclarationBlock;
  getFieldComment(node: FieldDefinitionNode): string;
  protected mergeAllFields(allFields: string[], _hasInterfaces: boolean): string;
  ObjectTypeDefinition(node: ObjectTypeDefinitionNode, key: number | string, parent: any): string;
  getInterfaceTypeDeclarationBlock(
    node: InterfaceTypeDefinitionNode,
    _originalNode: InterfaceTypeDefinitionNode
  ): DeclarationBlock;
  InterfaceTypeDefinition(node: InterfaceTypeDefinitionNode, key: number | string, parent: any): string;
  ScalarTypeDefinition(_node: ScalarTypeDefinitionNode): string;
  protected _buildTypeImport(identifier: string, source: string, asDefault?: boolean): string;
  protected handleEnumValueMapper(
    typeIdentifier: string,
    importIdentifier: string | null,
    sourceIdentifier: string | null,
    sourceFile: string | null
  ): string[];
  getEnumsImports(): string[];
  EnumTypeDefinition(node: EnumTypeDefinitionNode): string;
  StringValue(node: StringValueNode): string;
  protected makeValidEnumIdentifier(identifier: string): string;
  protected buildEnumValuesBlock(typeName: string, values: ReadonlyArray<EnumValueDefinitionNode>): string;
  DirectiveDefinition(_node: DirectiveDefinitionNode): string;
  getArgumentsObjectDeclarationBlock(
    node: InterfaceTypeDefinitionNode | ObjectTypeDefinitionNode,
    name: string,
    field: FieldDefinitionNode
  ): DeclarationBlock;
  getArgumentsObjectTypeDefinition(
    node: InterfaceTypeDefinitionNode | ObjectTypeDefinitionNode,
    name: string,
    field: FieldDefinitionNode
  ): string;
  protected buildArgumentsBlock(node: InterfaceTypeDefinitionNode | ObjectTypeDefinitionNode): string;
  protected _getScalar(name: string): string;
  protected _getTypeForNode(node: NamedTypeNode): string;
  NamedType(node: NamedTypeNode, key: any, parent: any, path: any, ancestors: any): string;
  ListType(node: ListTypeNode): string;
  SchemaDefinition(): any;
  protected getDeprecationReason(directive: DirectiveNode): string | void;
  protected wrapWithListType(str: string): string;
}
