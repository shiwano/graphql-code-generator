import {
  ClientSideBaseVisitor,
  ClientSideBasePluginConfig,
  LoadedFragment,
} from '@graphql-codegen/visitor-plugin-common';
import {
  OperationDefinitionNode,
  GraphQLSchema,
  TypeNode,
  InputObjectTypeDefinitionNode,
  EnumTypeDefinitionNode,
} from 'graphql';
import { CSharpOperationsRawPluginConfig } from './config';
import { Types } from '@graphql-codegen/plugin-helpers';
import { CSharpFieldType } from '../../common/common';
export interface CSharpOperationsPluginConfig extends ClientSideBasePluginConfig {
  namespaceName: string;
  namedClient: string;
  querySuffix: string;
  mutationSuffix: string;
  subscriptionSuffix: string;
  typesafeOperation: boolean;
}
export declare class CSharpOperationsVisitor extends ClientSideBaseVisitor<
  CSharpOperationsRawPluginConfig,
  CSharpOperationsPluginConfig
> {
  private _operationsToInclude;
  private _schemaAST;
  constructor(
    schema: GraphQLSchema,
    fragments: LoadedFragment[],
    rawConfig: CSharpOperationsRawPluginConfig,
    documents?: Types.DocumentFile[]
  );
  private overruleConfigSettings;
  private _operationHasDirective;
  private _extractDirective;
  private _namedClient;
  private _extractNamedClient;
  protected _gql(node: OperationDefinitionNode): string;
  private _getDocumentNodeVariable;
  private _gqlInputSignature;
  getCSharpImports(): string;
  private _operationSuffix;
  protected resolveFieldType(typeNode: TypeNode, hasDefaultValue?: Boolean): CSharpFieldType;
  private _getResponseFieldRecursive;
  private _getResponseClass;
  private _getVariablesClass;
  private _getOperationMethod;
  OperationDefinition(node: OperationDefinitionNode): string;
  InputObjectTypeDefinition(node: InputObjectTypeDefinitionNode): string;
  EnumTypeDefinition(node: EnumTypeDefinitionNode): string;
}
