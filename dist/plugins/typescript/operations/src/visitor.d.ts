import {
  AvoidOptionalsConfig,
  BaseDocumentsVisitor,
  DeclarationKind,
  LoadedFragment,
  ParsedDocumentsConfig,
} from '@graphql-codegen/visitor-plugin-common';
import { GraphQLSchema } from 'graphql';
import { TypeScriptDocumentsPluginConfig } from './config';
export interface TypeScriptDocumentsParsedConfig extends ParsedDocumentsConfig {
  arrayInputCoercion: boolean;
  avoidOptionals: AvoidOptionalsConfig;
  immutableTypes: boolean;
  noExport: boolean;
}
export declare class TypeScriptDocumentsVisitor extends BaseDocumentsVisitor<
  TypeScriptDocumentsPluginConfig,
  TypeScriptDocumentsParsedConfig
> {
  constructor(schema: GraphQLSchema, config: TypeScriptDocumentsPluginConfig, allFragments: LoadedFragment[]);
  getImports(): Array<string>;
  protected getPunctuation(_declarationKind: DeclarationKind): string;
  protected applyVariablesWrapper(variablesBlock: string): string;
}
