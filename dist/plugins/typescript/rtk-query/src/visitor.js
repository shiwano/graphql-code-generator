import { ClientSideBaseVisitor, getConfigValue, DocumentMode, } from '@graphql-codegen/visitor-plugin-common';
import { pascalCase } from 'change-case-all';
import autoBind from 'auto-bind';
export class RTKQueryVisitor extends ClientSideBaseVisitor {
    constructor(schema, fragments, rawConfig, documents) {
        super(schema, fragments, rawConfig, {
            documentMode: DocumentMode.string,
            importBaseApiFrom: getConfigValue(rawConfig.importBaseApiFrom, ''),
            exportHooks: getConfigValue(rawConfig.exportHooks, false),
            overrideExisting: getConfigValue(rawConfig.overrideExisting, ''),
        });
        this.rawConfig = rawConfig;
        this._endpoints = [];
        this._hooks = [];
        this._externalImportPrefix = this.config.importOperationTypesFrom ? `${this.config.importOperationTypesFrom}.` : '';
        this._documents = documents;
        autoBind(this);
    }
    get imports() {
        return this._imports;
    }
    get hasOperations() {
        return this._collectedOperations.length > 0;
    }
    getImports() {
        const baseImports = super.getImports();
        if (!this.hasOperations) {
            return baseImports;
        }
        return [...baseImports, `import { api } from '${this.config.importBaseApiFrom}';`];
    }
    getInjectCall() {
        return (`
const injectedRtkApi = api.injectEndpoints({
  ${!this.config.overrideExisting
            ? ''
            : `overrideExisting: ${this.config.overrideExisting},
  `}endpoints: (build) => ({${this._endpoints.join('')}
  }),
});

export { injectedRtkApi as api };
` +
            (this.config.exportHooks ? `export const { ${this._hooks.join(', ')} } = injectedRtkApi;` : '') +
            '\n\n');
    }
    buildOperation(node, documentVariableName, operationType, operationResultType, operationVariablesTypes, hasRequiredVariables) {
        var _a, _b;
        operationResultType = this._externalImportPrefix + operationResultType;
        operationVariablesTypes = this._externalImportPrefix + operationVariablesTypes;
        const operationName = (_a = node.name) === null || _a === void 0 ? void 0 : _a.value;
        if (!operationName)
            return '';
        const Generics = `${operationResultType}, ${operationVariablesTypes}${hasRequiredVariables ? '' : ' | void'}`;
        if (operationType === 'Query') {
            this._endpoints.push(`
    ${operationName}: build.query<${Generics}>({
      query: (variables) => ({ document: ${documentVariableName}, variables })
    }),`);
            if (this.config.exportHooks) {
                this._hooks.push(`use${pascalCase(operationName)}Query`);
                this._hooks.push(`useLazy${pascalCase(operationName)}Query`);
            }
        }
        else if (operationType === 'Mutation') {
            this._endpoints.push(`
    ${operationName}: build.mutation<${Generics}>({
      query: (variables) => ({ document: ${documentVariableName}, variables })
    }),`);
            if (this.config.exportHooks) {
                this._hooks.push(`use${pascalCase(operationName)}Mutation`);
            }
        }
        else if (operationType === 'Subscription') {
            // eslint-disable-next-line no-console
            console.warn(`Plugin "typescript-rtk-query" does not support GraphQL Subscriptions at the moment! Skipping "${(_b = node.name) === null || _b === void 0 ? void 0 : _b.value}"...`);
        }
        return '';
    }
}
//# sourceMappingURL=visitor.js.map