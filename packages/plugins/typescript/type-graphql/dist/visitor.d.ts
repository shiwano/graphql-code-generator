import { DeclarationBlock, AvoidOptionalsConfig } from '@graphql-codegen/visitor-plugin-common';
import { TypeGraphQLPluginConfig } from './config';
import {
  FieldDefinitionNode,
  EnumTypeDefinitionNode,
  InputValueDefinitionNode,
  GraphQLSchema,
  ObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  TypeNode,
  InputObjectTypeDefinitionNode,
  TypeDefinitionNode,
} from 'graphql';
import { TypeScriptPluginParsedConfig, TsVisitor } from '@graphql-codegen/typescript';
export declare type DecoratorConfig = {
  type: string;
  interface: string;
  field: string;
  input: string;
  arguments: string;
};
export interface TypeGraphQLPluginParsedConfig extends TypeScriptPluginParsedConfig {
  avoidOptionals: AvoidOptionalsConfig;
  constEnums: boolean;
  enumsAsTypes: boolean;
  immutableTypes: boolean;
  maybeValue: string;
  decoratorName: DecoratorConfig;
  decorateTypes?: string[];
}
interface Type {
  type: string;
  isNullable: boolean;
  isArray: boolean;
  isScalar: boolean;
  isItemsNullable: boolean;
}
declare type DecoratorOptions = {
  [key: string]: string;
};
export declare class TypeGraphQLVisitor<
  TRawConfig extends TypeGraphQLPluginConfig = TypeGraphQLPluginConfig,
  TParsedConfig extends TypeGraphQLPluginParsedConfig = TypeGraphQLPluginParsedConfig
> extends TsVisitor<TRawConfig, TParsedConfig> {
  typescriptVisitor: TsVisitor<TRawConfig, TParsedConfig>;
  constructor(schema: GraphQLSchema, pluginConfig: TRawConfig, additionalConfig?: Partial<TParsedConfig>);
  getDecoratorOptions(
    node:
      | ObjectTypeDefinitionNode
      | InterfaceTypeDefinitionNode
      | FieldDefinitionNode
      | InputObjectTypeDefinitionNode
      | InputValueDefinitionNode
  ): DecoratorOptions;
  getWrapperDefinitions(): string[];
  getFixDecoratorDefinition(): string;
  protected buildArgumentsBlock(node: InterfaceTypeDefinitionNode | ObjectTypeDefinitionNode): string;
  ObjectTypeDefinition(node: ObjectTypeDefinitionNode, key: number | string, parent: any): string;
  InputObjectTypeDefinition(node: InputObjectTypeDefinitionNode): string;
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
  InterfaceTypeDefinition(node: InterfaceTypeDefinitionNode, key: number | string, parent: any): string;
  buildTypeString(type: Type): string;
  parseType(rawType: TypeNode | string): Type;
  fixDecorator(type: Type, typeString: string): string;
  FieldDefinition(
    node: FieldDefinitionNode,
    key?: number | string,
    parent?: any,
    path?: any,
    ancestors?: TypeDefinitionNode[]
  ): string;
  InputValueDefinition(
    node: InputValueDefinitionNode,
    key?: number | string,
    parent?: any,
    path?: any,
    ancestors?: TypeDefinitionNode[]
  ): string;
  EnumTypeDefinition(node: EnumTypeDefinitionNode): string;
  protected clearOptional(str: string): string;
  protected hasTypeDecorators(typeName: string): boolean;
}
export {};
