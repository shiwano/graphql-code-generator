'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

const graphql = require('graphql');
const visitorPluginCommon = require('@graphql-codegen/visitor-plugin-common');
const autoBind = _interopDefault(require('auto-bind'));
const changeCaseAll = require('change-case-all');
const path = require('path');
const gql = _interopDefault(require('graphql-tag'));

const R_MOD = /module:\s*"([^"]+)"/; // matches: module: "..."
const R_NAME = /name:\s*"([^"]+)"/; // matches: name: "..."
function R_DEF(directive) {
    return new RegExp(`\\s+\\@${directive}\\([^)]+\\)`, 'gm');
}
class ApolloAngularVisitor extends visitorPluginCommon.ClientSideBaseVisitor {
    constructor(schema, fragments, _allOperations, rawConfig, documents) {
        super(schema, fragments, rawConfig, {
            sdkClass: rawConfig.sdkClass,
            ngModule: rawConfig.ngModule,
            namedClient: rawConfig.namedClient,
            serviceName: rawConfig.serviceName,
            serviceProvidedIn: rawConfig.serviceProvidedIn,
            serviceProvidedInRoot: rawConfig.serviceProvidedInRoot,
            querySuffix: rawConfig.querySuffix,
            mutationSuffix: rawConfig.mutationSuffix,
            subscriptionSuffix: rawConfig.subscriptionSuffix,
            additionalDI: visitorPluginCommon.getConfigValue(rawConfig.additionalDI, []),
            apolloAngularPackage: visitorPluginCommon.getConfigValue(rawConfig.apolloAngularPackage, 'apollo-angular'),
            apolloAngularVersion: visitorPluginCommon.getConfigValue(rawConfig.apolloAngularVersion, 2),
            gqlImport: visitorPluginCommon.getConfigValue(rawConfig.gqlImport, !rawConfig.apolloAngularVersion || rawConfig.apolloAngularVersion === 2 ? `apollo-angular#gql` : null),
        }, documents);
        this._allOperations = _allOperations;
        this._externalImportPrefix = '';
        this._operationsToInclude = [];
        this.dependencyInjections = '';
        this.dependencyInjectionArgs = '';
        if (this.config.importOperationTypesFrom) {
            this._externalImportPrefix = `${this.config.importOperationTypesFrom}.`;
            if (this.config.documentMode !== visitorPluginCommon.DocumentMode.external || !this.config.importDocumentNodeExternallyFrom) {
                // eslint-disable-next-line no-console
                console.warn('"importOperationTypesFrom" should be used with "documentMode=external" and "importDocumentNodeExternallyFrom"');
            }
            if (this.config.importOperationTypesFrom !== 'Operations') {
                // eslint-disable-next-line no-console
                console.warn('importOperationTypesFrom only works correctly when left empty or set to "Operations"');
            }
        }
        const dependencyInjections = ['apollo: Apollo.Apollo'].concat(this.config.additionalDI);
        const dependencyInjectionArgs = dependencyInjections.map(content => {
            return content.split(':')[0];
        });
        this.dependencyInjections = dependencyInjections.join(', ');
        this.dependencyInjectionArgs = dependencyInjectionArgs.join(', ');
        autoBind(this);
    }
    getImports() {
        const baseImports = super.getImports();
        const hasOperations = this._collectedOperations.length > 0;
        if (!hasOperations) {
            return baseImports;
        }
        const imports = [
            `import { Injectable } from '@angular/core';`,
            `import * as Apollo from '${this.config.apolloAngularPackage}';`,
        ];
        if (this.config.sdkClass) {
            const corePackage = this.config.apolloAngularVersion > 1 ? '@apollo/client/core' : 'apollo-client';
            imports.push(`import * as ApolloCore from '${corePackage}';`);
        }
        const defs = {};
        this._allOperations
            .filter(op => this._operationHasDirective(op, 'NgModule') || !!this.config.ngModule)
            .forEach(op => {
            const def = this._operationHasDirective(op, 'NgModule')
                ? this._extractNgModule(op)
                : this._parseNgModule(this.config.ngModule);
            // by setting key as link we easily get rid of duplicated imports
            // every path should be relative to the output file
            defs[def.link] = {
                path: def.path,
                module: def.module,
            };
        });
        if (this.config.serviceProvidedIn) {
            const ngModule = this._parseNgModule(this.config.serviceProvidedIn);
            defs[ngModule.link] = {
                path: ngModule.path,
                module: ngModule.module,
            };
        }
        Object.keys(defs).forEach(key => {
            const def = defs[key];
            // Every Angular Module that I've seen in my entire life use named exports
            imports.push(`import { ${def.module} } from '${def.path}';`);
        });
        return [...baseImports, ...imports];
    }
    _extractNgModule(operation) {
        const [, link] = graphql.print(operation).match(R_MOD);
        return this._parseNgModule(link);
    }
    _parseNgModule(link) {
        const [path, module] = link.split('#');
        return {
            path,
            module,
            link,
        };
    }
    _operationHasDirective(operation, directive) {
        if (typeof operation === 'string') {
            return operation.includes(`@${directive}`);
        }
        let found = false;
        graphql.visit(operation, {
            Directive(node) {
                if (node.name.value === directive) {
                    found = true;
                }
            },
        });
        return found;
    }
    _removeDirective(document, directive) {
        if (this._operationHasDirective(document, directive)) {
            return document.replace(R_DEF(directive), '');
        }
        return document;
    }
    _removeDirectives(document, directives) {
        return directives.reduce((doc, directive) => this._removeDirective(doc, directive), document);
    }
    _extractDirective(operation, directive) {
        const directives = graphql.print(operation).match(R_DEF(directive));
        if (directives.length > 1) {
            throw new Error(`The ${directive} directive used multiple times in '${operation.name}' operation`);
        }
        return directives[0];
    }
    _prepareDocument(documentStr) {
        return this._removeDirectives(documentStr, ['NgModule', 'namedClient']);
    }
    _namedClient(operation) {
        let name;
        if (this._operationHasDirective(operation, 'namedClient')) {
            name = this._extractNamedClient(operation);
        }
        else if (this.config.namedClient) {
            name = this.config.namedClient;
        }
        return name ? `client = '${name}';` : '';
    }
    // tries to find namedClient directive and extract {name}
    _extractNamedClient(operation) {
        const [, name] = this._extractDirective(operation, 'namedClient').match(R_NAME);
        return name;
    }
    _providedIn(operation) {
        if (this._operationHasDirective(operation, 'NgModule')) {
            return this._extractNgModule(operation).module;
        }
        else if (this.config.ngModule) {
            return this._parseNgModule(this.config.ngModule).module;
        }
        return `'root'`;
    }
    _getDocumentNodeVariable(node, documentVariableName) {
        return this.config.importOperationTypesFrom
            ? `${this.config.importOperationTypesFrom}.${documentVariableName}`
            : documentVariableName;
    }
    _operationSuffix(operationType) {
        const defaultSuffix = 'GQL';
        switch (operationType) {
            case 'Query':
                return this.config.querySuffix || defaultSuffix;
            case 'Mutation':
                return this.config.mutationSuffix || defaultSuffix;
            case 'Subscription':
                return this.config.subscriptionSuffix || defaultSuffix;
            default:
                return defaultSuffix;
        }
    }
    buildOperation(node, documentVariableName, operationType, operationResultType, operationVariablesTypes) {
        const serviceName = `${this.convertName(node)}${this._operationSuffix(operationType)}`;
        this._operationsToInclude.push({
            node,
            documentVariableName,
            operationType,
            operationResultType,
            operationVariablesTypes,
            serviceName,
        });
        operationResultType = this._externalImportPrefix + operationResultType;
        operationVariablesTypes = this._externalImportPrefix + operationVariablesTypes;
        const content = `
  @Injectable({
    providedIn: ${this._providedIn(node)}
  })
  export class ${serviceName} extends Apollo.${operationType}<${operationResultType}, ${operationVariablesTypes}> {
    document = ${this._getDocumentNodeVariable(node, documentVariableName)};
    ${this._namedClient(node)}
    constructor(${this.dependencyInjections}) {
      super(${this.dependencyInjectionArgs});
    }
  }`;
        return content;
    }
    get sdkClass() {
        const actionType = operation => {
            switch (operation) {
                case 'Mutation':
                    return 'mutate';
                case 'Subscription':
                    return 'subscribe';
                default:
                    return 'fetch';
            }
        };
        const allPossibleActions = this._operationsToInclude
            .map(o => {
            const operationResultType = this._externalImportPrefix + o.operationResultType;
            const operationVariablesTypes = this._externalImportPrefix + o.operationVariablesTypes;
            const optionalVariables = !o.node.variableDefinitions ||
                o.node.variableDefinitions.length === 0 ||
                o.node.variableDefinitions.every(v => v.type.kind !== graphql.Kind.NON_NULL_TYPE || !!v.defaultValue);
            const options = o.operationType === 'Mutation'
                ? `${o.operationType}OptionsAlone<${operationResultType}, ${operationVariablesTypes}>`
                : `${o.operationType}OptionsAlone<${operationVariablesTypes}>`;
            const method = `
${changeCaseAll.camelCase(o.node.name.value)}(variables${optionalVariables ? '?' : ''}: ${operationVariablesTypes}, options?: ${options}) {
  return this.${changeCaseAll.camelCase(o.serviceName)}.${actionType(o.operationType)}(variables, options)
}`;
            let watchMethod;
            if (o.operationType === 'Query') {
                watchMethod = `

${changeCaseAll.camelCase(o.node.name.value)}Watch(variables${optionalVariables ? '?' : ''}: ${operationVariablesTypes}, options?: WatchQueryOptionsAlone<${operationVariablesTypes}>) {
  return this.${changeCaseAll.camelCase(o.serviceName)}.watch(variables, options)
}`;
            }
            return [method, watchMethod].join('');
        })
            .map(s => visitorPluginCommon.indentMultiline(s, 2));
        // Inject the generated services in the constructor
        const injectString = (service) => `private ${changeCaseAll.camelCase(service)}: ${service}`;
        const injections = this._operationsToInclude
            .map(op => injectString(op.serviceName))
            .map(s => visitorPluginCommon.indentMultiline(s, 3))
            .join(',\n');
        const serviceName = this.config.serviceName || 'ApolloAngularSDK';
        const providedIn = this.config.serviceProvidedIn
            ? `{ providedIn: ${this._parseNgModule(this.config.serviceProvidedIn).module} }`
            : this.config.serviceProvidedInRoot === false
                ? ''
                : `{ providedIn: 'root' }`;
        return `
  type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

  interface WatchQueryOptionsAlone<V>
    extends Omit<ApolloCore.WatchQueryOptions<V>, 'query' | 'variables'> {}
    
  interface QueryOptionsAlone<V>
    extends Omit<ApolloCore.QueryOptions<V>, 'query' | 'variables'> {}
    
  interface MutationOptionsAlone<T, V>
    extends Omit<ApolloCore.MutationOptions<T, V>, 'mutation' | 'variables'> {}
    
  interface SubscriptionOptionsAlone<V>
    extends Omit<ApolloCore.SubscriptionOptions<V>, 'query' | 'variables'> {}

  @Injectable(${providedIn})
  export class ${serviceName} {
    constructor(
${injections}
    ) {}
  ${allPossibleActions.join('\n')}
  }`;
    }
}

const plugin = (schema, documents, config) => {
    const allAst = graphql.concatAST(documents.map(v => v.document));
    const operations = allAst.definitions.filter(d => d.kind === graphql.Kind.OPERATION_DEFINITION);
    const allFragments = [
        ...allAst.definitions.filter(d => d.kind === graphql.Kind.FRAGMENT_DEFINITION).map(fragmentDef => ({
            node: fragmentDef,
            name: fragmentDef.name.value,
            onType: fragmentDef.typeCondition.name.value,
            isExternal: false,
        })),
        ...(config.externalFragments || []),
    ];
    const visitor = new ApolloAngularVisitor(schema, allFragments, operations, config, documents);
    const visitorResult = graphql.visit(allAst, { leave: visitor });
    return {
        prepend: visitor.getImports(),
        content: [
            visitor.fragments,
            ...visitorResult.definitions.filter(t => typeof t === 'string'),
            config.sdkClass ? visitor.sdkClass : null,
        ]
            .filter(a => a)
            .join('\n'),
    };
};
const addToSchema = gql `
  directive @NgModule(module: String!) on OBJECT | FIELD
  directive @namedClient(name: String!) on OBJECT | FIELD
`;
const validate = async (schema, documents, config, outputFile) => {
    if (path.extname(outputFile) !== '.ts') {
        throw new Error(`Plugin "apollo-angular" requires extension to be ".ts"!`);
    }
};

exports.ApolloAngularVisitor = ApolloAngularVisitor;
exports.addToSchema = addToSchema;
exports.plugin = plugin;
exports.validate = validate;
