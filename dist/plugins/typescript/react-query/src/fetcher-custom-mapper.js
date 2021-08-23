import { parseMapper, buildMapperImport } from '@graphql-codegen/visitor-plugin-common';
export class CustomMapperFetcher {
    constructor(visitor, customFetcher) {
        this.visitor = visitor;
        if (typeof customFetcher === 'string') {
            customFetcher = { func: customFetcher };
        }
        this._mapper = parseMapper(customFetcher.func);
        this._isReactHook = customFetcher.isReactHook;
    }
    getFetcherFnName(operationResultType, operationVariablesTypes) {
        return `${this._mapper.type}<${operationResultType}, ${operationVariablesTypes}>`;
    }
    generateFetcherImplementaion() {
        if (this._mapper.isExternal) {
            return buildMapperImport(this._mapper.source, [
                {
                    identifier: this._mapper.type,
                    asDefault: this._mapper.default,
                },
            ], this.visitor.config.useTypeImports);
        }
        return null;
    }
    generateQueryHook(node, documentVariableName, operationName, operationResultType, operationVariablesTypes, hasRequiredVariables) {
        const variables = `variables${hasRequiredVariables ? '' : '?'}: ${operationVariablesTypes}`;
        const hookConfig = this.visitor.queryMethodMap;
        this.visitor.reactQueryIdentifiersInUse.add(hookConfig.query.hook);
        this.visitor.reactQueryIdentifiersInUse.add(hookConfig.query.options);
        const options = `options?: ${hookConfig.query.options}<${operationResultType}, TError, TData>`;
        const typedFetcher = this.getFetcherFnName(operationResultType, operationVariablesTypes);
        const impl = this._isReactHook
            ? `${typedFetcher}(${documentVariableName}).bind(null, variables)`
            : `${typedFetcher}(${documentVariableName}, variables)`;
        return `export const use${operationName} = <
      TData = ${operationResultType},
      TError = ${this.visitor.config.errorType}
    >(
      ${variables}, 
      ${options}
    ) => 
    ${hookConfig.query.hook}<${operationResultType}, TError, TData>(
      ['${node.name.value}', variables],
      ${impl},
      options
    );`;
    }
    generateMutationHook(node, documentVariableName, operationName, operationResultType, operationVariablesTypes) {
        const variables = `variables?: ${operationVariablesTypes}`;
        const hookConfig = this.visitor.queryMethodMap;
        this.visitor.reactQueryIdentifiersInUse.add(hookConfig.mutation.hook);
        this.visitor.reactQueryIdentifiersInUse.add(hookConfig.mutation.options);
        const options = `options?: ${hookConfig.mutation.options}<${operationResultType}, TError, ${operationVariablesTypes}, TContext>`;
        const typedFetcher = this.getFetcherFnName(operationResultType, operationVariablesTypes);
        const impl = this._isReactHook
            ? `${typedFetcher}(${documentVariableName})`
            : `(${variables}) => ${typedFetcher}(${documentVariableName}, variables)()`;
        return `export const use${operationName} = <
      TError = ${this.visitor.config.errorType},
      TContext = unknown
    >(${options}) => 
    ${hookConfig.mutation.hook}<${operationResultType}, TError, ${operationVariablesTypes}, TContext>(
      ${impl},
      options
    );`;
    }
    generateFetcherFetch(node, documentVariableName, operationName, operationResultType, operationVariablesTypes, hasRequiredVariables) {
        // We can't generate a fetcher field since we can't call react hooks outside of a React Fucntion Component
        // Related: https://reactjs.org/docs/hooks-rules.html
        if (this._isReactHook)
            return '';
        const variables = `variables${hasRequiredVariables ? '' : '?'}: ${operationVariablesTypes}`;
        const typedFetcher = this.getFetcherFnName(operationResultType, operationVariablesTypes);
        const impl = `${typedFetcher}(${documentVariableName}, variables)`;
        return `\nuse${operationName}.fetcher = (${variables}) => ${impl};`;
    }
}
//# sourceMappingURL=fetcher-custom-mapper.js.map