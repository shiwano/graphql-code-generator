import { ClientSideBaseVisitor, getConfigValue, OMIT_TYPE, DocumentMode, } from '@graphql-codegen/visitor-plugin-common';
import autoBind from 'auto-bind';
import { Kind } from 'graphql';
import { pascalCase } from 'change-case-all';
import { camelCase } from 'change-case-all';
const APOLLO_CLIENT_3_UNIFIED_PACKAGE = `@apollo/client`;
const GROUPED_APOLLO_CLIENT_3_IDENTIFIER = 'Apollo';
export class ReactApolloVisitor extends ClientSideBaseVisitor {
    constructor(schema, fragments, rawConfig, documents) {
        super(schema, fragments, rawConfig, {
            componentSuffix: getConfigValue(rawConfig.componentSuffix, 'Component'),
            withHOC: getConfigValue(rawConfig.withHOC, false),
            withComponent: getConfigValue(rawConfig.withComponent, false),
            withHooks: getConfigValue(rawConfig.withHooks, true),
            withMutationFn: getConfigValue(rawConfig.withMutationFn, true),
            withRefetchFn: getConfigValue(rawConfig.withRefetchFn, false),
            apolloReactCommonImportFrom: getConfigValue(rawConfig.apolloReactCommonImportFrom, rawConfig.reactApolloVersion === 2 ? '@apollo/react-common' : APOLLO_CLIENT_3_UNIFIED_PACKAGE),
            apolloReactComponentsImportFrom: getConfigValue(rawConfig.apolloReactComponentsImportFrom, rawConfig.reactApolloVersion === 2
                ? '@apollo/react-components'
                : `${APOLLO_CLIENT_3_UNIFIED_PACKAGE}/react/components`),
            apolloReactHocImportFrom: getConfigValue(rawConfig.apolloReactHocImportFrom, rawConfig.reactApolloVersion === 2 ? '@apollo/react-hoc' : `${APOLLO_CLIENT_3_UNIFIED_PACKAGE}/react/hoc`),
            apolloReactHooksImportFrom: getConfigValue(rawConfig.apolloReactHooksImportFrom, rawConfig.reactApolloVersion === 2 ? '@apollo/react-hooks' : APOLLO_CLIENT_3_UNIFIED_PACKAGE),
            reactApolloVersion: getConfigValue(rawConfig.reactApolloVersion, 3),
            withResultType: getConfigValue(rawConfig.withResultType, true),
            withMutationOptionsType: getConfigValue(rawConfig.withMutationOptionsType, true),
            addDocBlocks: getConfigValue(rawConfig.addDocBlocks, true),
            defaultBaseOptions: getConfigValue(rawConfig.defaultBaseOptions, {}),
            gqlImport: getConfigValue(rawConfig.gqlImport, rawConfig.reactApolloVersion === 2 ? null : `${APOLLO_CLIENT_3_UNIFIED_PACKAGE}#gql`),
            hooksSuffix: getConfigValue(rawConfig.hooksSuffix, ''),
        });
        this.rawConfig = rawConfig;
        this.imports = new Set();
        this._externalImportPrefix = this.config.importOperationTypesFrom ? `${this.config.importOperationTypesFrom}.` : '';
        this._documents = documents;
        autoBind(this);
    }
    getImportStatement(isTypeImport) {
        return isTypeImport && this.config.useTypeImports ? 'import type' : 'import';
    }
    getReactImport() {
        return `import * as React from 'react';`;
    }
    getApolloReactCommonIdentifier() {
        if (this.rawConfig.apolloReactCommonImportFrom || this.config.reactApolloVersion === 2) {
            return `ApolloReactCommon`;
        }
        return GROUPED_APOLLO_CLIENT_3_IDENTIFIER;
    }
    getApolloReactHooksIdentifier() {
        if (this.rawConfig.apolloReactHooksImportFrom || this.config.reactApolloVersion === 2) {
            return `ApolloReactHooks`;
        }
        return GROUPED_APOLLO_CLIENT_3_IDENTIFIER;
    }
    usesExternalHooksOnly() {
        const apolloReactCommonIdentifier = this.getApolloReactCommonIdentifier();
        return (apolloReactCommonIdentifier === GROUPED_APOLLO_CLIENT_3_IDENTIFIER &&
            this.config.apolloReactHooksImportFrom !== APOLLO_CLIENT_3_UNIFIED_PACKAGE &&
            this.config.withHooks &&
            !this.config.withComponent &&
            !this.config.withHOC);
    }
    getApolloReactCommonImport(isTypeImport) {
        const apolloReactCommonIdentifier = this.getApolloReactCommonIdentifier();
        return `${this.getImportStatement(isTypeImport &&
            (apolloReactCommonIdentifier !== GROUPED_APOLLO_CLIENT_3_IDENTIFIER || this.usesExternalHooksOnly()))} * as ${apolloReactCommonIdentifier} from '${this.config.apolloReactCommonImportFrom}';`;
    }
    getApolloReactComponentsImport(isTypeImport) {
        return `${this.getImportStatement(isTypeImport)} * as ApolloReactComponents from '${this.config.apolloReactComponentsImportFrom}';`;
    }
    getApolloReactHocImport(isTypeImport) {
        return `${this.getImportStatement(isTypeImport)} * as ApolloReactHoc from '${this.config.apolloReactHocImportFrom}';`;
    }
    getApolloReactHooksImport(isTypeImport) {
        return `${this.getImportStatement(isTypeImport)} * as ${this.getApolloReactHooksIdentifier()} from '${this.config.apolloReactHooksImportFrom}';`;
    }
    getOmitDeclaration() {
        return OMIT_TYPE;
    }
    getDefaultOptions() {
        return `const defaultOptions =  ${JSON.stringify(this.config.defaultBaseOptions)}`;
    }
    getDocumentNodeVariable(node, documentVariableName) {
        var _a, _b;
        return this.config.documentMode === DocumentMode.external
            ? `Operations.${(_b = (_a = node.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : ''}`
            : documentVariableName;
    }
    getImports() {
        const baseImports = super.getImports();
        const hasOperations = this._collectedOperations.length > 0;
        if (!hasOperations) {
            return baseImports;
        }
        return [...baseImports, ...Array.from(this.imports)];
    }
    _buildHocProps(operationName, operationType) {
        const typeVariableName = this._externalImportPrefix +
            this.convertName(operationName + pascalCase(operationType) + this._parsedConfig.operationResultSuffix);
        const variablesVarName = this._externalImportPrefix + this.convertName(operationName + pascalCase(operationType) + 'Variables');
        const typeArgs = `<${typeVariableName}, ${variablesVarName}>`;
        if (operationType === 'mutation') {
            this.imports.add(this.getApolloReactCommonImport(true));
            return `${this.getApolloReactCommonIdentifier()}.MutationFunction${typeArgs}`;
        }
        else {
            this.imports.add(this.getApolloReactHocImport(true));
            return `ApolloReactHoc.DataValue${typeArgs}`;
        }
    }
    _buildMutationFn(node, operationResultType, operationVariablesTypes) {
        var _a, _b;
        if (node.operation === 'mutation') {
            this.imports.add(this.getApolloReactCommonImport(true));
            return `export type ${this.convertName(((_b = (_a = node.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '') + 'MutationFn')} = ${this.getApolloReactCommonIdentifier()}.MutationFunction<${operationResultType}, ${operationVariablesTypes}>;`;
        }
        return null;
    }
    _buildOperationHoc(node, documentVariableName, operationResultType, operationVariablesTypes) {
        var _a, _b;
        this.imports.add(this.getApolloReactCommonImport(false));
        this.imports.add(this.getApolloReactHocImport(false));
        const nodeName = (_b = (_a = node.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '';
        const operationName = this.convertName(nodeName, { useTypesPrefix: false });
        const propsTypeName = this.convertName(nodeName, { suffix: 'Props' });
        const defaultDataName = node.operation === 'mutation' ? 'mutate' : 'data';
        const propsVar = `export type ${propsTypeName}<TChildProps = {}, TDataName extends string = '${defaultDataName}'> = {
      [key in TDataName]: ${this._buildHocProps(nodeName, node.operation)}
    } & TChildProps;`;
        const hocString = `export function with${operationName}<TProps, TChildProps = {}, TDataName extends string = '${defaultDataName}'>(operationOptions?: ApolloReactHoc.OperationOption<
  TProps,
  ${operationResultType},
  ${operationVariablesTypes},
  ${propsTypeName}<TChildProps, TDataName>>) {
    return ApolloReactHoc.with${pascalCase(node.operation)}<TProps, ${operationResultType}, ${operationVariablesTypes}, ${propsTypeName}<TChildProps, TDataName>>(${this.getDocumentNodeVariable(node, documentVariableName)}, {
      alias: '${camelCase(operationName)}',
      ...operationOptions
    });
};`;
        return [propsVar, hocString].filter(a => a).join('\n');
    }
    _buildComponent(node, documentVariableName, operationType, operationResultType, operationVariablesTypes) {
        var _a, _b;
        const nodeName = (_b = (_a = node.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '';
        const componentPropsName = this.convertName(nodeName, {
            suffix: this.config.componentSuffix + 'Props',
            useTypesPrefix: false,
        });
        const componentName = this.convertName(nodeName, {
            suffix: this.config.componentSuffix,
            useTypesPrefix: false,
        });
        const isVariablesRequired = operationType === 'Query' &&
            node.variableDefinitions.some(variableDef => variableDef.type.kind === Kind.NON_NULL_TYPE);
        this.imports.add(this.getReactImport());
        this.imports.add(this.getApolloReactCommonImport(true));
        this.imports.add(this.getApolloReactComponentsImport(false));
        this.imports.add(this.getOmitDeclaration());
        const propsType = `Omit<ApolloReactComponents.${operationType}ComponentOptions<${operationResultType}, ${operationVariablesTypes}>, '${operationType.toLowerCase()}'>`;
        let componentProps = '';
        if (isVariablesRequired) {
            componentProps = `export type ${componentPropsName} = ${propsType} & ({ variables: ${operationVariablesTypes}; skip?: boolean; } | { skip: boolean; });`;
        }
        else {
            componentProps = `export type ${componentPropsName} = ${propsType};`;
        }
        const component = `
    export const ${componentName} = (props: ${componentPropsName}) => (
      <ApolloReactComponents.${operationType}<${operationResultType}, ${operationVariablesTypes}> ${node.operation}={${this.getDocumentNodeVariable(node, documentVariableName)}} {...props} />
    );
    `;
        return [componentProps, component].join('\n');
    }
    _buildHooksJSDoc(node, operationName, operationType) {
        const variableString = node.variableDefinitions.reduce((acc, item) => {
            const name = item.variable.name.value;
            return `${acc}\n *      ${name}: // value for '${name}'`;
        }, '');
        const queryDescription = `
 * To run a query within a React component, call \`use${operationName}\` and pass it any options that fit your needs.
 * When your component renders, \`use${operationName}\` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.`;
        const queryExample = `
 * const { data, loading, error } = use${operationName}({
 *   variables: {${variableString}
 *   },
 * });`;
        const mutationDescription = `
 * To run a mutation, you first call \`use${operationName}\` within a React component and pass it any options that fit your needs.
 * When your component renders, \`use${operationName}\` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution`;
        const mutationExample = `
 * const [${camelCase(operationName)}, { data, loading, error }] = use${operationName}({
 *   variables: {${variableString}
 *   },
 * });`;
        return `
/**
 * __use${operationName}__
 *${operationType === 'Mutation' ? mutationDescription : queryDescription}
 *
 * @param baseOptions options that will be passed into the ${operationType.toLowerCase()}, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#${operationType === 'Mutation' ? 'options-2' : 'options'};
 *
 * @example${operationType === 'Mutation' ? mutationExample : queryExample}
 */`;
    }
    _buildHooks(node, operationType, documentVariableName, operationResultType, operationVariablesTypes, hasRequiredVariables) {
        var _a, _b;
        const nodeName = (_b = (_a = node.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '';
        const suffix = this._getHookSuffix(nodeName, operationType);
        const operationName = this.convertName(nodeName, {
            suffix,
            useTypesPrefix: false,
            useTypesSuffix: false,
        }) + this.config.hooksSuffix;
        this.imports.add(this.getApolloReactCommonImport(true));
        this.imports.add(this.getApolloReactHooksImport(false));
        this.imports.add(this.getDefaultOptions());
        const hookFns = [
            `export function use${operationName}(baseOptions${hasRequiredVariables && operationType !== 'Mutation' ? '' : '?'}: ${this.getApolloReactHooksIdentifier()}.${operationType}HookOptions<${operationResultType}, ${operationVariablesTypes}>) {
        const options = {...defaultOptions, ...baseOptions}
        return ${this.getApolloReactHooksIdentifier()}.use${operationType}<${operationResultType}, ${operationVariablesTypes}>(${this.getDocumentNodeVariable(node, documentVariableName)}, options);
      }`,
        ];
        if (this.config.addDocBlocks) {
            hookFns.unshift(this._buildHooksJSDoc(node, operationName, operationType));
        }
        const hookResults = [`export type ${operationName}HookResult = ReturnType<typeof use${operationName}>;`];
        if (operationType === 'Query') {
            const lazyOperationName = this.convertName(nodeName, {
                suffix: pascalCase('LazyQuery'),
                useTypesPrefix: false,
            });
            hookFns.push(`export function use${lazyOperationName}(baseOptions?: ${this.getApolloReactHooksIdentifier()}.LazyQueryHookOptions<${operationResultType}, ${operationVariablesTypes}>) {
          const options = {...defaultOptions, ...baseOptions}
          return ${this.getApolloReactHooksIdentifier()}.useLazyQuery<${operationResultType}, ${operationVariablesTypes}>(${this.getDocumentNodeVariable(node, documentVariableName)}, options);
        }`);
            hookResults.push(`export type ${lazyOperationName}HookResult = ReturnType<typeof use${lazyOperationName}>;`);
        }
        return [...hookFns, ...hookResults].join('\n');
    }
    _getHookSuffix(name, operationType) {
        if (this.config.omitOperationSuffix) {
            return '';
        }
        if (!this.config.dedupeOperationSuffix) {
            return pascalCase(operationType);
        }
        if (name.includes('Query') || name.includes('Mutation') || name.includes('Subscription')) {
            return '';
        }
        return pascalCase(operationType);
    }
    _buildResultType(node, operationType, operationResultType, operationVariablesTypes) {
        var _a, _b;
        const componentResultType = this.convertName((_b = (_a = node.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '', {
            suffix: `${operationType}Result`,
            useTypesPrefix: false,
        });
        switch (node.operation) {
            case 'query':
                this.imports.add(this.getApolloReactCommonImport(true));
                return `export type ${componentResultType} = ${this.getApolloReactCommonIdentifier()}.QueryResult<${operationResultType}, ${operationVariablesTypes}>;`;
            case 'mutation':
                this.imports.add(this.getApolloReactCommonImport(true));
                return `export type ${componentResultType} = ${this.getApolloReactCommonIdentifier()}.MutationResult<${operationResultType}>;`;
            case 'subscription':
                this.imports.add(this.getApolloReactCommonImport(true));
                return `export type ${componentResultType} = ${this.getApolloReactCommonIdentifier()}.SubscriptionResult<${operationResultType}>;`;
            default:
                return '';
        }
    }
    _buildWithMutationOptionsType(node, operationResultType, operationVariablesTypes) {
        var _a, _b;
        if (node.operation !== 'mutation') {
            return '';
        }
        this.imports.add(this.getApolloReactCommonImport(true));
        const mutationOptionsType = this.convertName((_b = (_a = node.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '', {
            suffix: 'MutationOptions',
            useTypesPrefix: false,
        });
        return `export type ${mutationOptionsType} = ${this.getApolloReactCommonIdentifier()}.BaseMutationOptions<${operationResultType}, ${operationVariablesTypes}>;`;
    }
    _buildRefetchFn(node, documentVariableName, operationType, operationVariablesTypes) {
        var _a, _b;
        if (node.operation !== 'query') {
            return '';
        }
        const nodeName = (_b = (_a = node.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '';
        const operationName = this.convertName(nodeName, {
            suffix: this._getHookSuffix(nodeName, operationType),
            useTypesPrefix: false,
        }) + this.config.hooksSuffix;
        return `export function refetch${operationName}(variables?: ${operationVariablesTypes}) {
      return { query: ${this.getDocumentNodeVariable(node, documentVariableName)}, variables: variables }
    }`;
    }
    buildOperation(node, documentVariableName, operationType, operationResultType, operationVariablesTypes, hasRequiredVariables) {
        operationResultType = this._externalImportPrefix + operationResultType;
        operationVariablesTypes = this._externalImportPrefix + operationVariablesTypes;
        const mutationFn = this.config.withMutationFn || this.config.withComponent
            ? this._buildMutationFn(node, operationResultType, operationVariablesTypes)
            : null;
        const component = this.config.withComponent
            ? this._buildComponent(node, documentVariableName, operationType, operationResultType, operationVariablesTypes)
            : null;
        const hoc = this.config.withHOC
            ? this._buildOperationHoc(node, documentVariableName, operationResultType, operationVariablesTypes)
            : null;
        const hooks = this.config.withHooks
            ? this._buildHooks(node, operationType, documentVariableName, operationResultType, operationVariablesTypes, hasRequiredVariables)
            : null;
        const resultType = this.config.withResultType
            ? this._buildResultType(node, operationType, operationResultType, operationVariablesTypes)
            : null;
        const mutationOptionsType = this.config.withMutationOptionsType
            ? this._buildWithMutationOptionsType(node, operationResultType, operationVariablesTypes)
            : null;
        const refetchFn = this.config.withRefetchFn
            ? this._buildRefetchFn(node, documentVariableName, operationType, operationVariablesTypes)
            : null;
        return [mutationFn, component, hoc, hooks, resultType, mutationOptionsType, refetchFn].filter(a => a).join('\n');
    }
}
//# sourceMappingURL=visitor.js.map