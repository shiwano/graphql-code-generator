'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

const path = require('path');
const graphql = require('graphql');
const visitorPluginCommon = require('@graphql-codegen/visitor-plugin-common');
const autoBind = _interopDefault(require('auto-bind'));
const changeCaseAll = require('change-case-all');

function insertIf(condition, ...elements) {
    return condition ? elements : [];
}
class VueApolloVisitor extends visitorPluginCommon.ClientSideBaseVisitor {
    constructor(schema, fragments, rawConfig, documents) {
        super(schema, fragments, rawConfig, {
            withSmartOperationFunctions: visitorPluginCommon.getConfigValue(rawConfig.withSmartOperationFunctions, true),
            vueApolloOperationFunctionsImportFrom: visitorPluginCommon.getConfigValue(rawConfig.vueApolloOperationFunctionsImportFrom, 'vue-apollo-smart-ops'),
            vueApolloErrorType: visitorPluginCommon.getConfigValue(rawConfig.vueApolloErrorType, 'ApolloError'),
            vueApolloErrorTypeImportFrom: visitorPluginCommon.getConfigValue(rawConfig.vueApolloErrorTypeImportFrom, 'apollo-client'),
            vueApolloErrorHandlerFunction: visitorPluginCommon.getConfigValue(rawConfig.vueApolloErrorHandlerFunction, undefined),
            vueApolloErrorHandlerFunctionImportFrom: visitorPluginCommon.getConfigValue(rawConfig.vueApolloErrorHandlerFunctionImportFrom, undefined),
            vueAppType: visitorPluginCommon.getConfigValue(rawConfig.vueAppType, undefined),
            vueAppTypeImportFrom: visitorPluginCommon.getConfigValue(rawConfig.vueAppTypeImportFrom, undefined),
            addDocBlocks: visitorPluginCommon.getConfigValue(rawConfig.addDocBlocks, true),
        });
        this.imports = new Set();
        this.externalImportPrefix = this.config.importOperationTypesFrom ? `${this.config.importOperationTypesFrom}.` : '';
        this._documents = documents;
        autoBind(this);
    }
    get vueApolloOperationFunctionsImport() {
        return `import { createMutationFunction, createSmartQueryOptionsFunction, createSmartSubscriptionOptionsFunction } from '${this.config.vueApolloOperationFunctionsImportFrom}';`;
    }
    get vueApolloErrorTypeImport() {
        return `import { ${this.config.vueApolloErrorType} } from '${this.config.vueApolloErrorTypeImportFrom}';`;
    }
    get vueApolloErrorHandlerFunctionImport() {
        if (!this.config.vueApolloErrorHandlerFunction || !this.config.vueApolloErrorHandlerFunctionImportFrom) {
            return '';
        }
        return `import { ${this.config.vueApolloErrorHandlerFunction} } from '${this.config.vueApolloErrorHandlerFunctionImportFrom}';`;
    }
    get vueAppTypeImport() {
        if (!this.config.vueAppType || !this.config.vueAppTypeImportFrom) {
            return '';
        }
        return `import { ${this.config.vueAppType} } from '${this.config.vueAppTypeImportFrom}';`;
    }
    getDocumentNodeVariable(node, documentVariableName) {
        var _a;
        return this.config.documentMode === visitorPluginCommon.DocumentMode.external ? `Operations.${(_a = node.name) === null || _a === void 0 ? void 0 : _a.value}` : documentVariableName;
    }
    getImports() {
        const baseImports = super.getImports();
        const hasOperations = this._collectedOperations.length > 0;
        if (!hasOperations) {
            return baseImports;
        }
        return [...baseImports, ...Array.from(this.imports)];
    }
    buildOperationFunctionsJSDoc(node, operationName, operationType) {
        var _a;
        const operationFunctionName = operationType === 'Mutation' ? changeCaseAll.camelCase(operationName) : `use${operationName}`;
        const operationNameWithoutSuffix = changeCaseAll.camelCase(operationName).replace(/(Query|Mutation|Subscription)$/, '');
        const exampleVariables = ((_a = node.variableDefinitions) !== null && _a !== void 0 ? _a : []).map(variableDefinition => {
            const name = variableDefinition.variable.name.value;
            return `${name}: // value for '${name}'`;
        });
        switch (operationType) {
            case 'Query':
                return `
/**
 * __${operationFunctionName}__
 *
 * To use a Smart Query within a Vue component, call \`${operationFunctionName}\` as the value for a query key
 * in the component's \`apollo\` config, passing any options required for the query.
 *
 * @param options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/core/ApolloClient/#ApolloClient.query
 *
 * @example
 * {
 *   apollo: {
 *     ${operationNameWithoutSuffix}: ${operationFunctionName}({
 *       variables: {${exampleVariables.length > 0
                    ? `
 *         ${exampleVariables.join(`
 *         `)}
 *       `
                    : ''}},
 *       loadingKey: 'loading',
 *       fetchPolicy: 'no-cache',
 *     }),
 *   }
 * }
 */`;
            case 'Mutation':
                return `
/**
 * __${operationFunctionName}__
 *
 * To run a mutation, you call \`${operationFunctionName}\` within a Vue component and pass it
 * your Vue app instance along with any options that fit your needs.
 *
 * @param app, a reference to your Vue app instance (which must have a \`$apollo\` property)
 * @param options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/core/ApolloClient/#ApolloClient.mutate
 * @param client (optional), which can be an instance of \`DollarApollo\` or the \`mutate()\` function provided by an \`<ApolloMutation>\` component
 *
 * @example
 * const { success, data, errors } = ${operationFunctionName}(this, {
 *   variables: {${exampleVariables.length > 0
                    ? `
 *     ${exampleVariables.join(`
 *     `)}
 *   `
                    : ''}},
 * });
 */`;
            case 'Subscription':
                return `
/**
 * __${operationFunctionName}__
 *
 * To use a Smart Subscription within a Vue component, call \`${operationFunctionName}\` as the value for a \`$subscribe\` key
 * in the component's \`apollo\` config, passing any options required for the subscription.
 *
 * @param options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/core/ApolloClient/#ApolloClient.subscribe
 *
 * @example
 * {
 *   apollo: {
 *     $subscribe: {
 *       ${operationNameWithoutSuffix}: ${operationFunctionName}({
 *         variables: {${exampleVariables.length > 0
                    ? `
 *           ${exampleVariables.join(`
 *           `)}
 *         `
                    : ''}},
 *         loadingKey: 'loading',
 *         fetchPolicy: 'no-cache',
 *       }),
 *     },
 *   }
 * }
 */`;
        }
    }
    getOperationFunctionSuffix(name, operationType) {
        if (!this.config.dedupeOperationSuffix) {
            return this.config.omitOperationSuffix ? '' : changeCaseAll.pascalCase(operationType);
        }
        if (name.includes('Query') || name.includes('Mutation') || name.includes('Subscription')) {
            return '';
        }
        return changeCaseAll.pascalCase(operationType);
    }
    buildOperation(node, documentVariableName, operationType, operationResultType, operationVariablesTypes) {
        var _a, _b, _c;
        operationResultType = this.externalImportPrefix + operationResultType;
        operationVariablesTypes = this.externalImportPrefix + operationVariablesTypes;
        if (!this.config.withSmartOperationFunctions) {
            // todo - throw human readable error
            return '';
        }
        if (!((_a = node.name) === null || _a === void 0 ? void 0 : _a.value)) {
            // todo - throw human readable error
            return '';
        }
        const suffix = this.getOperationFunctionSuffix(node.name.value, operationType);
        const operationName = this.convertName(node.name.value, {
            suffix,
            useTypesPrefix: false,
        });
        const operationHasVariables = ((_b = node.variableDefinitions) !== null && _b !== void 0 ? _b : []).length > 0;
        const operationHasNonNullableVariable = !!((_c = node.variableDefinitions) === null || _c === void 0 ? void 0 : _c.some(({ type }) => type.kind === 'NonNullType'));
        this.imports.add(this.vueApolloOperationFunctionsImport);
        this.imports.add(this.vueApolloErrorTypeImport);
        if (this.vueApolloErrorHandlerFunctionImport) {
            this.imports.add(this.vueApolloErrorHandlerFunctionImport);
        }
        if (this.vueAppTypeImport) {
            this.imports.add(this.vueAppTypeImport);
        }
        const documentNodeVariable = this.getDocumentNodeVariable(node, documentVariableName); // i.e. TestDocument
        const operationFunction = this.buildOperationFunction({
            operationName,
            operationType,
            operationResultType,
            operationVariablesTypes,
            operationHasNonNullableVariable,
            operationHasVariables,
            documentNodeVariable,
        });
        return [
            ...insertIf(this.config.addDocBlocks, [this.buildOperationFunctionsJSDoc(node, operationName, operationType)]),
            operationFunction,
            '',
        ].join('\n');
    }
    buildOperationFunction({ operationName, operationType, operationResultType, operationVariablesTypes, documentNodeVariable, }) {
        const operationArguments = [documentNodeVariable];
        if (this.config.vueApolloErrorHandlerFunction) {
            operationArguments.push(this.config.vueApolloErrorHandlerFunction);
        }
        const genericTypeArguments = [
            operationResultType,
            operationVariablesTypes,
            this.config.vueApolloErrorType,
        ];
        if (this.config.vueAppType) {
            genericTypeArguments.push(this.config.vueAppType);
        }
        switch (operationType) {
            case 'Query': {
                return `export const use${operationName} = createSmartQueryOptionsFunction<
  ${genericTypeArguments.join(',\n  ')}
>(${operationArguments.join(', ')});`;
            }
            case 'Mutation': {
                return `export const ${changeCaseAll.camelCase(operationName)} = createMutationFunction<
  ${genericTypeArguments.join(',\n  ')}
>(${operationArguments.join(', ')});`;
            }
            case 'Subscription': {
                return `export const use${operationName} = createSmartSubscriptionOptionsFunction<
  ${genericTypeArguments.join(',\n  ')}
>(${operationArguments.join(', ')});`;
            }
        }
    }
}

const plugin = (schema, documents, config) => {
    const allAst = graphql.concatAST(documents.map(s => s.document));
    const allFragments = [
        ...allAst.definitions.filter(d => d.kind === graphql.Kind.FRAGMENT_DEFINITION).map(fragmentDef => ({
            node: fragmentDef,
            name: fragmentDef.name.value,
            onType: fragmentDef.typeCondition.name.value,
            isExternal: false,
        })),
        ...(config.externalFragments || []),
    ];
    const visitor = new VueApolloVisitor(schema, allFragments, config, documents);
    const visitorResult = graphql.visit(allAst, { leave: visitor });
    return {
        prepend: visitor.getImports(),
        content: [
            visitor.fragments,
            ...visitorResult.definitions.filter((definition) => typeof definition === 'string'),
        ].join('\n'),
    };
};
const validate = (_schema, _documents, _config, outputFile) => {
    if (path.extname(outputFile) !== '.ts' && path.extname(outputFile) !== '.tsx') {
        throw new Error(`Plugin "typescript-vue-apollo-smart-ops" requires extension to be ".ts" or ".tsx"!`);
    }
};

exports.VueApolloVisitor = VueApolloVisitor;
exports.plugin = plugin;
exports.validate = validate;
