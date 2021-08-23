import { ClientSideBaseVisitor, getConfigValue, OMIT_TYPE, } from '@graphql-codegen/visitor-plugin-common';
import autoBind from 'auto-bind';
import { pascalCase } from 'change-case-all';
export class UrqlVisitor extends ClientSideBaseVisitor {
    constructor(schema, fragments, rawConfig) {
        super(schema, fragments, rawConfig, {
            withComposition: getConfigValue(rawConfig.withComposition, true),
            urqlImportFrom: getConfigValue(rawConfig.urqlImportFrom, '@urql/vue'),
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
        imports.push(OMIT_TYPE);
        return [...baseImports, ...imports];
    }
    _buildCompositionFn(node, operationType, documentVariableName, operationResultType, operationVariablesTypes) {
        var _a, _b;
        const operationName = this.convertName((_b = (_a = node.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '', {
            suffix: this.config.omitOperationSuffix ? '' : pascalCase(operationType),
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
//# sourceMappingURL=visitor.js.map