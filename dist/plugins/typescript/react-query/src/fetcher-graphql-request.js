import { generateQueryKey, generateQueryVariablesSignature } from './variables-generator';
export class GraphQLRequestClientFetcher {
    constructor(visitor) {
        this.visitor = visitor;
    }
    generateFetcherImplementaion() {
        return `
function fetcher<TData, TVariables>(client: GraphQLClient, query: string, variables?: TVariables) {
  return async (): Promise<TData> => client.request<TData, TVariables>(query, variables);
}`;
    }
    generateQueryHook(node, documentVariableName, operationName, operationResultType, operationVariablesTypes, hasRequiredVariables) {
        const variables = generateQueryVariablesSignature(hasRequiredVariables, operationVariablesTypes);
        const typeImport = this.visitor.config.useTypeImports ? 'import type' : 'import';
        this.visitor.imports.add(`${typeImport} { GraphQLClient } from 'graphql-request';`);
        const hookConfig = this.visitor.queryMethodMap;
        this.visitor.reactQueryIdentifiersInUse.add(hookConfig.query.hook);
        this.visitor.reactQueryIdentifiersInUse.add(hookConfig.query.options);
        const options = `options?: ${hookConfig.query.options}<${operationResultType}, TError, TData>`;
        return `export const use${operationName} = <
      TData = ${operationResultType},
      TError = ${this.visitor.config.errorType}
    >(
      client: GraphQLClient, 
      ${variables}, 
      ${options}
    ) => 
    ${hookConfig.query.hook}<${operationResultType}, TError, TData>(
      ${generateQueryKey(node)},
      fetcher<${operationResultType}, ${operationVariablesTypes}>(client, ${documentVariableName}, variables),
      options
    );`;
    }
    generateMutationHook(node, documentVariableName, operationName, operationResultType, operationVariablesTypes) {
        const variables = `variables?: ${operationVariablesTypes}`;
        this.visitor.imports.add(`import { GraphQLClient } from 'graphql-request';`);
        const hookConfig = this.visitor.queryMethodMap;
        this.visitor.reactQueryIdentifiersInUse.add(hookConfig.mutation.hook);
        this.visitor.reactQueryIdentifiersInUse.add(hookConfig.mutation.options);
        const options = `options?: ${hookConfig.mutation.options}<${operationResultType}, TError, ${operationVariablesTypes}, TContext>`;
        return `export const use${operationName} = <
      TError = ${this.visitor.config.errorType},
      TContext = unknown
    >(
      client: GraphQLClient, 
      ${options}
    ) => 
    ${hookConfig.mutation.hook}<${operationResultType}, TError, ${operationVariablesTypes}, TContext>(
      (${variables}) => fetcher<${operationResultType}, ${operationVariablesTypes}>(client, ${documentVariableName}, variables)(),
      options
    );`;
    }
    generateFetcherFetch(node, documentVariableName, operationName, operationResultType, operationVariablesTypes, hasRequiredVariables) {
        const variables = generateQueryVariablesSignature(hasRequiredVariables, operationVariablesTypes);
        return `\nuse${operationName}.fetcher = (client: GraphQLClient, ${variables}) => fetcher<${operationResultType}, ${operationVariablesTypes}>(client, ${documentVariableName}, variables);`;
    }
}
//# sourceMappingURL=fetcher-graphql-request.js.map