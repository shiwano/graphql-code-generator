import { BaseVisitor, EnumValuesMap, ParsedConfig } from '@graphql-codegen/visitor-plugin-common';
import { KotlinResolversPluginRawConfig } from './config';
import {
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  GraphQLSchema,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  ObjectTypeDefinitionNode,
  TypeNode,
  ValueNode,
} from 'graphql';
export declare const KOTLIN_SCALARS: {
  ID: string;
  String: string;
  Boolean: string;
  Int: string;
  Float: string;
};
export interface KotlinResolverParsedConfig extends ParsedConfig {
  package: string;
  listType: string;
  enumValues: EnumValuesMap;
  withTypes: boolean;
}
export interface FieldDefinitionReturnType {
  inputTransformer?: ((typeName: string) => string) | FieldDefinitionNode;
  node: FieldDefinitionNode;
}
export declare class KotlinResolversVisitor extends BaseVisitor<
  KotlinResolversPluginRawConfig,
  KotlinResolverParsedConfig
> {
  private _schema;
  constructor(rawConfig: KotlinResolversPluginRawConfig, _schema: GraphQLSchema, defaultPackageName: string);
  getPackageName(): string;
  protected getEnumValue(enumName: string, enumOption: string): string;
  EnumValueDefinition(node: EnumValueDefinitionNode): (enumName: string) => string;
  EnumTypeDefinition(node: EnumTypeDefinitionNode): string;
  protected resolveInputFieldType(typeNode: TypeNode): {
    baseType: string;
    typeName: string;
    isScalar: boolean;
    isArray: boolean;
    nullable: boolean;
  };
  protected buildInputTransfomer(name: string, inputValueArray: ReadonlyArray<InputValueDefinitionNode>): string;
  protected buildTypeTransfomer(name: string, typeValueArray: ReadonlyArray<FieldDefinitionNode>): string;
  protected initialValue(typeName: string, defaultValue?: ValueNode): string | undefined;
  FieldDefinition(node: FieldDefinitionNode): FieldDefinitionReturnType;
  InputObjectTypeDefinition(node: InputObjectTypeDefinitionNode): string;
  ObjectTypeDefinition(node: ObjectTypeDefinitionNode): string;
}
