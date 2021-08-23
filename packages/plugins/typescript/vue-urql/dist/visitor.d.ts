import {
  ClientSideBaseVisitor,
  ClientSideBasePluginConfig,
  LoadedFragment,
} from '@graphql-codegen/visitor-plugin-common';
import { VueUrqlRawPluginConfig } from './config';
import { OperationDefinitionNode, GraphQLSchema } from 'graphql';
export interface UrqlPluginConfig extends ClientSideBasePluginConfig {
  withComposition: boolean;
  urqlImportFrom: string;
}
export declare class UrqlVisitor extends ClientSideBaseVisitor<VueUrqlRawPluginConfig, UrqlPluginConfig> {
  constructor(schema: GraphQLSchema, fragments: LoadedFragment[], rawConfig: VueUrqlRawPluginConfig);
  getImports(): string[];
  private _buildCompositionFn;
  protected buildOperation(
    node: OperationDefinitionNode,
    documentVariableName: string,
    operationType: string,
    operationResultType: string,
    operationVariablesTypes: string
  ): string;
}
