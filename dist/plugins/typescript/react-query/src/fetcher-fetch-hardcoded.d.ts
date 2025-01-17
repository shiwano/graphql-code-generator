import { OperationDefinitionNode } from 'graphql';
import { ReactQueryVisitor } from './visitor';
import { FetcherRenderer } from './fetcher';
import { HardcodedFetch } from './config';
export declare class HardcodedFetchFetcher implements FetcherRenderer {
  private visitor;
  private config;
  constructor(visitor: ReactQueryVisitor, config: HardcodedFetch);
  private getEndpoint;
  private getFetchParams;
  generateFetcherImplementaion(): string;
  generateQueryHook(
    node: OperationDefinitionNode,
    documentVariableName: string,
    operationName: string,
    operationResultType: string,
    operationVariablesTypes: string,
    hasRequiredVariables: boolean
  ): string;
  generateMutationHook(
    node: OperationDefinitionNode,
    documentVariableName: string,
    operationName: string,
    operationResultType: string,
    operationVariablesTypes: string
  ): string;
  generateFetcherFetch(
    node: OperationDefinitionNode,
    documentVariableName: string,
    operationName: string,
    operationResultType: string,
    operationVariablesTypes: string,
    hasRequiredVariables: boolean
  ): string;
}
