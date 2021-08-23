import { ClientSideBaseVisitor, LoadedFragment } from '@graphql-codegen/visitor-plugin-common';
import { OperationDefinitionNode, GraphQLSchema } from 'graphql';
import { RTKQueryPluginConfig, RTKQueryRawPluginConfig } from './config';
import { Types } from '@graphql-codegen/plugin-helpers';
export declare class RTKQueryVisitor extends ClientSideBaseVisitor<RTKQueryRawPluginConfig, RTKQueryPluginConfig> {
  protected rawConfig: RTKQueryRawPluginConfig;
  private _externalImportPrefix;
  private _endpoints;
  private _hooks;
  constructor(
    schema: GraphQLSchema,
    fragments: LoadedFragment[],
    rawConfig: RTKQueryRawPluginConfig,
    documents: Types.DocumentFile[]
  );
  get imports(): Set<string>;
  get hasOperations(): boolean;
  getImports(): string[];
  getInjectCall(): string;
  protected buildOperation(
    node: OperationDefinitionNode,
    documentVariableName: string,
    operationType: string,
    operationResultType: string,
    operationVariablesTypes: string,
    hasRequiredVariables: boolean
  ): string;
}
