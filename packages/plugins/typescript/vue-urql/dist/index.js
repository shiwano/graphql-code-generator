'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

const graphql = require('graphql');
const visitorPluginCommon = require('@graphql-codegen/visitor-plugin-common');
const autoBind = _interopDefault(require('auto-bind'));
const changeCaseAll = require('change-case-all');
const path = require('path');

class UrqlVisitor extends visitorPluginCommon.ClientSideBaseVisitor {
    constructor(schema, fragments, rawConfig) {
        super(schema, fragments, rawConfig, {
            withComposition: visitorPluginCommon.getConfigValue(rawConfig.withComposition, true),
            urqlImportFrom: visitorPluginCommon.getConfigValue(rawConfig.urqlImportFrom, '@urql/vue'),
        });
        autoBind(this);
    }
    getImports() {
        const baseImports = super.getImports();
        const imports = [];
        const hasOperations = this._collectedOperations.length > 0;
        if (!hasOperations) {
            return baseImports;
        }
        if (this.config.withComposition) {
            imports.push(`import * as Urql from '${this.config.urqlImportFrom}';`);
        }
        imports.push(visitorPluginCommon.OMIT_TYPE);
        return [...baseImports, ...imports];
    }
    _buildCompositionFn(node, operationType, documentVariableName, operationResultType, operationVariablesTypes) {
        var _a, _b;
        const operationName = this.convertName((_b = (_a = node.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '', {
            suffix: this.config.omitOperationSuffix ? '' : changeCaseAll.pascalCase(operationType),
            useTypesPrefix: false,
        });
        if (operationType === 'Mutation') {
            return `
export function use${operationName}() {
  return Urql.use${operationType}<${operationResultType}, ${operationVariablesTypes}>(${documentVariableName});
};`;
        }
        if (operationType === 'Subscription') {
            return `
export function use${operationName}<R = ${operationResultType}>(options: Omit<Urql.Use${operationType}Args<never, ${operationVariablesTypes}>, 'query'> = {}, handler?: Urql.SubscriptionHandlerArg<${operationResultType}, R>) {
  return Urql.use${operationType}<${operationResultType}, R, ${operationVariablesTypes}>({ query: ${documentVariableName}, ...options }, handler);
};`;
        }
        return `
export function use${operationName}(options: Omit<Urql.Use${operationType}Args<never, ${operationVariablesTypes}>, 'query'> = {}) {
  return Urql.use${operationType}<${operationResultType}>({ query: ${documentVariableName}, ...options });
};`;
    }
    buildOperation(node, documentVariableName, operationType, operationResultType, operationVariablesTypes) {
        const composition = this.config.withComposition
            ? this._buildCompositionFn(node, operationType, documentVariableName, operationResultType, operationVariablesTypes)
            : null;
        return [composition].filter(a => a).join('\n');
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
    const visitor = new UrqlVisitor(schema, allFragments, config);
    const visitorResult = graphql.visit(allAst, { leave: visitor });
    return {
        prepend: visitor.getImports(),
        content: [visitor.fragments, ...visitorResult.definitions.filter(t => typeof t === 'string')].join('\n'),
    };
};
const validate = async (schema, documents, config, outputFile) => {
    if (path.extname(outputFile) !== '.ts') {
        throw new Error(`Plugin "typescript-vue-urql" requires extension to be ".ts"!`);
    }
};

exports.UrqlVisitor = UrqlVisitor;
exports.plugin = plugin;
exports.validate = validate;
