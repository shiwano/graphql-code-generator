'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

const graphql = require('graphql');
const path = require('path');
const visitorPluginCommon = require('@graphql-codegen/visitor-plugin-common');
const autoBind = _interopDefault(require('auto-bind'));

class GenericSdkVisitor extends visitorPluginCommon.ClientSideBaseVisitor {
    constructor(schema, fragments, rawConfig) {
        super(schema, fragments, rawConfig, {
            usingObservableFrom: rawConfig.usingObservableFrom,
        });
        this._operationsToInclude = [];
        autoBind(this);
        if (this.config.usingObservableFrom) {
            this._additionalImports.push(this.config.usingObservableFrom);
        }
        if (this.config.documentMode !== visitorPluginCommon.DocumentMode.string) {
            const importType = this.config.useTypeImports ? 'import type' : 'import';
            this._additionalImports.push(`${importType} { DocumentNode } from 'graphql';`);
        }
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
    get sdkContent() {
        const usingObservable = !!this.config.usingObservableFrom;
        const allPossibleActions = this._operationsToInclude
            .map(o => {
            const optionalVariables = !o.node.variableDefinitions ||
                o.node.variableDefinitions.length === 0 ||
                o.node.variableDefinitions.every(v => v.type.kind !== graphql.Kind.NON_NULL_TYPE || v.defaultValue);
            const returnType = usingObservable && o.operationType === 'Subscription' ? 'Observable' : 'Promise';
            return `${o.node.name.value}(variables${optionalVariables ? '?' : ''}: ${o.operationVariablesTypes}, options?: C): ${returnType}<${o.operationResultType}> {
  return requester<${o.operationResultType}, ${o.operationVariablesTypes}>(${o.documentVariableName}, variables, options);
}`;
        })
            .map(s => visitorPluginCommon.indentMultiline(s, 2));
        return `export type Requester<C= {}> = <R, V>(doc: ${this.config.documentMode === visitorPluginCommon.DocumentMode.string ? 'string' : 'DocumentNode'}, vars?: V, options?: C) => ${usingObservable ? 'Promise<R> & Observable<R>' : 'Promise<R>'}
export function getSdk<C>(requester: Requester<C>) {
  return {
${allPossibleActions.join(',\n')}
  };
}
export type Sdk = ReturnType<typeof getSdk>;`;
    }
}

const plugin = (schema, documents, config) => {
    const allAst = graphql.concatAST(documents.reduce((prev, v) => {
        return [...prev, v.document];
    }, []));
    const allFragments = [
        ...allAst.definitions.filter(d => d.kind === graphql.Kind.FRAGMENT_DEFINITION).map(fragmentDef => ({
            node: fragmentDef,
            name: fragmentDef.name.value,
            onType: fragmentDef.typeCondition.name.value,
            isExternal: false,
        })),
        ...(config.externalFragments || []),
    ];
    const visitor = new GenericSdkVisitor(schema, allFragments, config);
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
        throw new Error(`Plugin "typescript-generic-sdk" requires extension to be ".ts"!`);
    }
};

exports.GenericSdkVisitor = GenericSdkVisitor;
exports.plugin = plugin;
exports.validate = validate;
