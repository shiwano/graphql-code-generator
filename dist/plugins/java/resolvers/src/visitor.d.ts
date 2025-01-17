import { ParsedConfig, BaseVisitor, ParsedMapper } from '@graphql-codegen/visitor-plugin-common';
import { JavaResolversPluginRawConfig } from './config';
import {
  GraphQLSchema,
  NamedTypeNode,
  ObjectTypeDefinitionNode,
  FieldDefinitionNode,
  InterfaceTypeDefinitionNode,
} from 'graphql';
import { UnionTypeDefinitionNode } from 'graphql/language/ast.js';
export interface JavaResolverParsedConfig extends ParsedConfig {
  package: string;
  mappers: {
    [typeName: string]: ParsedMapper;
  };
  defaultMapper: ParsedMapper;
  className: string;
  listType: string;
}
export declare class JavaResolversVisitor extends BaseVisitor<JavaResolversPluginRawConfig, JavaResolverParsedConfig> {
  private _includeTypeResolverImport;
  constructor(rawConfig: JavaResolversPluginRawConfig, _schema: GraphQLSchema, defaultPackageName: string);
  getImports(): string;
  protected mappersImports(): string[];
  protected getTypeToUse(type: NamedTypeNode): string;
  getPackageName(): string;
  wrapWithClass(content: string): string;
  UnionTypeDefinition(node: UnionTypeDefinitionNode): string;
  InterfaceTypeDefinition(node: InterfaceTypeDefinitionNode): string;
  ObjectTypeDefinition(node: ObjectTypeDefinitionNode): string;
  FieldDefinition(node: FieldDefinitionNode, key: string | number, _parent: any): (isInterface: boolean) => string;
}
