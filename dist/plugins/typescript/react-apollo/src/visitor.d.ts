import {
  ClientSideBaseVisitor,
  ClientSideBasePluginConfig,
  LoadedFragment,
} from '@graphql-codegen/visitor-plugin-common';
import { ReactApolloRawPluginConfig } from './config';
import { OperationDefinitionNode, GraphQLSchema } from 'graphql';
import { Types } from '@graphql-codegen/plugin-helpers';
export interface ReactApolloPluginConfig extends ClientSideBasePluginConfig {
  withComponent: boolean;
  withHOC: boolean;
  withHooks: boolean;
  withMutationFn: boolean;
  withRefetchFn: boolean;
  apolloReactCommonImportFrom: string;
  apolloReactComponentsImportFrom: string;
  apolloReactHocImportFrom: string;
  apolloReactHooksImportFrom: string;
  componentSuffix: string;
  reactApolloVersion: 2 | 3;
  withResultType: boolean;
  withMutationOptionsType: boolean;
  addDocBlocks: boolean;
  defaultBaseOptions: {
    [key: string]: string;
  };
  hooksSuffix: string;
}
export declare class ReactApolloVisitor extends ClientSideBaseVisitor<
  ReactApolloRawPluginConfig,
  ReactApolloPluginConfig
> {
  protected rawConfig: ReactApolloRawPluginConfig;
  private _externalImportPrefix;
  private imports;
  constructor(
    schema: GraphQLSchema,
    fragments: LoadedFragment[],
    rawConfig: ReactApolloRawPluginConfig,
    documents: Types.DocumentFile[]
  );
  private getImportStatement;
  private getReactImport;
  private getApolloReactCommonIdentifier;
  private getApolloReactHooksIdentifier;
  private usesExternalHooksOnly;
  private getApolloReactCommonImport;
  private getApolloReactComponentsImport;
  private getApolloReactHocImport;
  private getApolloReactHooksImport;
  private getOmitDeclaration;
  private getDefaultOptions;
  private getDocumentNodeVariable;
  getImports(): string[];
  private _buildHocProps;
  private _buildMutationFn;
  private _buildOperationHoc;
  private _buildComponent;
  private _buildHooksJSDoc;
  private _buildHooks;
  private _getHookSuffix;
  private _buildResultType;
  private _buildWithMutationOptionsType;
  private _buildRefetchFn;
  protected buildOperation(
    node: OperationDefinitionNode,
    documentVariableName: string,
    operationType: string,
    operationResultType: string,
    operationVariablesTypes: string,
    hasRequiredVariables: boolean
  ): string;
}
