import { OperationDefinitionNode } from 'graphql';
import { ReactQueryVisitor } from './visitor';
import { FetcherRenderer } from './fetcher';
import { CustomFetch } from './config';
export declare class CustomMapperFetcher implements FetcherRenderer {
  private visitor;
  private _mapper;
  private _isReactHook;
  constructor(visitor: ReactQueryVisitor, customFetcher: CustomFetch);
  private getFetcherFnName;
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
