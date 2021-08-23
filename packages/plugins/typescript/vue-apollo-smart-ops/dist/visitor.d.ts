import {
  ClientSideBaseVisitor,
  ClientSideBasePluginConfig,
  LoadedFragment,
} from '@graphql-codegen/visitor-plugin-common';
import { OperationDefinitionNode, GraphQLSchema } from 'graphql';
import { Types } from '@graphql-codegen/plugin-helpers';
import { VueApolloSmartOpsRawPluginConfig } from './config';
export interface VueApolloSmartOpsPluginConfig extends ClientSideBasePluginConfig {
  withSmartOperationFunctions: boolean;
  vueApolloOperationFunctionsImportFrom: 'vue-apollo-smart-ops' | string;
  vueApolloErrorType: 'ApolloError' | string;
  vueApolloErrorTypeImportFrom: 'apollo-client' | string;
  vueApolloErrorHandlerFunction?: string;
  vueApolloErrorHandlerFunctionImportFrom?: string;
  vueAppType?: string;
  vueAppTypeImportFrom?: string;
  addDocBlocks: boolean;
}
declare type OperationTypeName = 'Query' | 'Mutation' | 'Subscription';
export declare class VueApolloVisitor extends ClientSideBaseVisitor<
  VueApolloSmartOpsRawPluginConfig,
  VueApolloSmartOpsPluginConfig
> {
  private externalImportPrefix;
  private imports;
  constructor(
    schema: GraphQLSchema,
    fragments: LoadedFragment[],
    rawConfig: VueApolloSmartOpsRawPluginConfig,
    documents: Types.DocumentFile[]
  );
  private get vueApolloOperationFunctionsImport();
  private get vueApolloErrorTypeImport();
  private get vueApolloErrorHandlerFunctionImport();
  private get vueAppTypeImport();
  private getDocumentNodeVariable;
  getImports(): string[];
  private buildOperationFunctionsJSDoc;
  private getOperationFunctionSuffix;
  protected buildOperation(
    node: OperationDefinitionNode,
    documentVariableName: string,
    operationType: OperationTypeName,
    operationResultType: string,
    operationVariablesTypes: string
  ): string;
  private buildOperationFunction;
}
export {};
