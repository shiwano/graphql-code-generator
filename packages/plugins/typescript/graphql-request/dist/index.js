'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

const graphql = require('graphql');
const visitorPluginCommon = require('@graphql-codegen/visitor-plugin-common');
const autoBind = _interopDefault(require('auto-bind'));
const path = require('path');

const additionalExportedTypes = `
export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string) => Promise<T>;
`;
class GraphQLRequestVisitor extends visitorPluginCommon.ClientSideBaseVisitor {
    constructor(schema, fragments, rawConfig) {
        super(schema, fragments, rawConfig, {
            rawRequest: visitorPluginCommon.getConfigValue(rawConfig.rawRequest, false),
        });
        this._operationsToInclude = [];
        autoBind(this);
        const typeImport = this.config.useTypeImports ? 'import type' : 'import';
        this._additionalImports.push(`${typeImport} { GraphQLClient } from 'graphql-request';`);
        this._additionalImports.push(`${typeImport} * as Dom from 'graphql-request/dist/types.dom';`);
        if (this.config.rawRequest) {
            this._additionalImports.push(`${typeImport} { GraphQLError } from 'graphql-request/dist/types';`);
            if (this.config.documentMode !== visitorPluginCommon.DocumentMode.string) {
                this._additionalImports.push(`${typeImport} { print } from 'graphql'`);
            }
        }
    }
    OperationDefinition(node) {
        var _a;
        const operationName = (_a = node.name) === null || _a === void 0 ? void 0 : _a.value;
        if (!operationName) {
            // eslint-disable-next-line no-console
            console.warn(`Anonymous GraphQL operation was ignored in "typescript-graphql-request", please make sure to name your operation: `, graphql.print(node));
            return null;
        }
        return super.OperationDefinition(node);
    }
    buildOperation(node, documentVariableName, operationType, operationResultType, operationVariablesTypes) {
        this._operationsToInclude.push({
            node,
            documentVariableName,
            operationType,
            operationResultType,
            operationVariablesTypes,
        });
        return null;
    }
    getDocumentNodeVariable(documentVariableName) {
        return this.config.documentMode === visitorPluginCommon.DocumentMode.external
            ? `Operations.${documentVariableName}`
            : documentVariableName;
    }
    get sdkContent() {
        const extraVariables = [];
        const allPossibleActions = this._operationsToInclude
            .map(o => {
            const operationName = o.node.name.value;
            const optionalVariables = !o.node.variableDefinitions ||
                o.node.variableDefinitions.length === 0 ||
                o.node.variableDefinitions.every(v => v.type.kind !== graphql.Kind.NON_NULL_TYPE || v.defaultValue);
            const docVarName = this.getDocumentNodeVariable(o.documentVariableName);
            if (this.config.rawRequest) {
                let docArg = docVarName;
                if (this.config.documentMode !== visitorPluginCommon.DocumentMode.string) {
                    docArg = `${docVarName}String`;
                    extraVariables.push(`const ${docArg} = print(${docVarName});`);
                }
                return `${operationName}(variables${optionalVariables ? '?' : ''}: ${o.operationVariablesTypes}, requestHeaders?: Dom.RequestInit["headers"]): Promise<{ data?: ${o.operationResultType} | undefined; extensions?: any; headers: Dom.Headers; status: number; errors?: GraphQLError[] | undefined; }> {
    return withWrapper((wrappedRequestHeaders) => client.rawRequest<${o.operationResultType}>(${docArg}, variables, {...requestHeaders, ...wrappedRequestHeaders}), '${operationName}');
}`;
            }
            else {
                return `${operationName}(variables${optionalVariables ? '?' : ''}: ${o.operationVariablesTypes}, requestHeaders?: Dom.RequestInit["headers"]): Promise<${o.operationResultType}> {
  return withWrapper((wrappedRequestHeaders) => client.request<${o.operationResultType}>(${docVarName}, variables, {...requestHeaders, ...wrappedRequestHeaders}), '${operationName}');
}`;
            }
        })
            .filter(Boolean)
            .map(s => visitorPluginCommon.indentMultiline(s, 2));
        return `${additionalExportedTypes}

const defaultWrapper: SdkFunctionWrapper = (action, _operationName) => action();
${extraVariables.join('\n')}
export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
${allPossibleActions.join(',\n')}
  };
}
export type Sdk = ReturnType<typeof getSdk>;`;
    }
}

const plugin = (schema, documents, config) => {
    const allAst = graphql.concatAST(documents.map(v => v.document));
    const allFragments = [
        ...allAst.definitions.filter(d => d.kind === graphql.Kind.FRAGMENT_DEFINITION).map(fragmentDef => ({
            node: fragmentDef,
            name: fragmentDef.name.value,
            onType: fragmentDef.typeCondition.name.value,
            isExternal: false,
        })),
        ...(config.externalFragments || []),
    ];
    const visitor = new GraphQLRequestVisitor(schema, allFragments, config);
    const visitorResult = graphql.visit(allAst, { leave: visitor });
    return {
        prepend: visitor.getImports(),
        content: [
            visitor.fragments,
            ...visitorResult.definitions.filter(t => typeof t === 'string'),
            visitor.sdkContent,
        ].join('\n'),
    };
};
const validate = async (schema, documents, config, outputFile) => {
    if (path.extname(outputFile) !== '.ts') {
        throw new Error(`Plugin "typescript-graphql-request" requires extension to be ".ts"!`);
    }
};

exports.GraphQLRequestVisitor = GraphQLRequestVisitor;
exports.plugin = plugin;
exports.validate = validate;
