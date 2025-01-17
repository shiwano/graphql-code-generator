import { createRequire } from 'module';
import { cwd } from 'process';
import * as changeCaseAll from 'change-case-all';
import { isListType, isNonNullType, visit, Kind, isObjectType, parse, GraphQLObjectType } from 'graphql';
import merge from 'lodash/merge.js';
import { mapSchema, MapperKind, astFromObjectType, getDocumentNodeFromSchema } from '@graphql-tools/utils';
import { getRootTypeNames } from '@graphql-codegen/visitor-plugin-common';

function resolveExternalModuleAndFn(pointer) {
    if (typeof pointer === 'function') {
        return pointer;
    }
    // eslint-disable-next-line prefer-const
    let [moduleName, functionName] = pointer.split('#');
    // Temp workaround until v2
    if (moduleName === 'change-case') {
        moduleName = 'change-case-all';
    }
    let loadedModule;
    if (moduleName === 'change-case-all') {
        loadedModule = changeCaseAll;
    }
    else {
        const cwdRequire = createRequire(cwd());
        loadedModule = cwdRequire(moduleName);
        if (!(functionName in loadedModule) && typeof loadedModule !== 'function') {
            throw new Error(`${functionName} couldn't be found in module ${moduleName}!`);
        }
    }
    return loadedModule[functionName] || loadedModule;
}

function isComplexPluginOutput(obj) {
    return typeof obj === 'object' && obj.hasOwnProperty('content');
}

function mergeOutputs(content) {
    const result = { content: '', prepend: [], append: [] };
    if (Array.isArray(content)) {
        content.forEach(item => {
            if (typeof item === 'string') {
                result.content += item;
            }
            else {
                result.content += item.content;
                result.prepend.push(...(item.prepend || []));
                result.append.push(...(item.append || []));
            }
        });
    }
    return [...result.prepend, result.content, ...result.append].join('\n');
}
function isWrapperType(t) {
    return isListType(t) || isNonNullType(t);
}
function getBaseType(type) {
    if (isWrapperType(type)) {
        return getBaseType(type.ofType);
    }
    else {
        return type;
    }
}
function removeNonNullWrapper(type) {
    return isNonNullType(type) ? type.ofType : type;
}

function isOutputConfigArray(type) {
    return Array.isArray(type);
}
function isConfiguredOutput(type) {
    return (typeof type === 'object' && type.plugins) || type.preset;
}
function normalizeOutputParam(config) {
    // In case of direct array with a list of plugins
    if (isOutputConfigArray(config)) {
        return {
            documents: [],
            schema: [],
            plugins: isConfiguredOutput(config) ? config.plugins : config,
        };
    }
    else if (isConfiguredOutput(config)) {
        return config;
    }
    else {
        throw new Error(`Invalid "generates" config!`);
    }
}
function normalizeInstanceOrArray(type) {
    if (Array.isArray(type)) {
        return type;
    }
    else if (!type) {
        return [];
    }
    return [type];
}
function normalizeConfig(config) {
    if (typeof config === 'string') {
        return [{ [config]: {} }];
    }
    else if (Array.isArray(config)) {
        return config.map(plugin => (typeof plugin === 'string' ? { [plugin]: {} } : plugin));
    }
    else if (typeof config === 'object') {
        return Object.keys(config).reduce((prev, pluginName) => [...prev, { [pluginName]: config[pluginName] }], []);
    }
    else {
        return [];
    }
}
function hasNullableTypeRecursively(type) {
    if (!isNonNullType(type)) {
        return true;
    }
    if (isListType(type) || isNonNullType(type)) {
        return hasNullableTypeRecursively(type.ofType);
    }
    return false;
}
function isUsingTypes(document, externalFragments, schema) {
    let foundFields = 0;
    const typesStack = [];
    visit(document, {
        SelectionSet: {
            enter(node, key, parent, anscestors) {
                const insideIgnoredFragment = anscestors.find((f) => f.kind && f.kind === 'FragmentDefinition' && externalFragments.includes(f.name.value));
                if (insideIgnoredFragment) {
                    return;
                }
                const selections = node.selections || [];
                if (schema && selections.length > 0) {
                    const nextTypeName = (() => {
                        if (parent.kind === Kind.FRAGMENT_DEFINITION) {
                            return parent.typeCondition.name.value;
                        }
                        else if (parent.kind === Kind.FIELD) {
                            const lastType = typesStack[typesStack.length - 1];
                            if (!lastType) {
                                throw new Error(`Unable to find parent type! Please make sure you operation passes validation`);
                            }
                            const field = lastType.getFields()[parent.name.value];
                            if (!field) {
                                throw new Error(`Unable to find field "${parent.name.value}" on type "${lastType}"!`);
                            }
                            return getBaseType(field.type).name;
                        }
                        else if (parent.kind === Kind.OPERATION_DEFINITION) {
                            if (parent.operation === 'query') {
                                return schema.getQueryType().name;
                            }
                            else if (parent.operation === 'mutation') {
                                return schema.getMutationType().name;
                            }
                            else if (parent.operation === 'subscription') {
                                return schema.getSubscriptionType().name;
                            }
                        }
                        else if (parent.kind === Kind.INLINE_FRAGMENT) {
                            if (parent.typeCondition) {
                                return parent.typeCondition.name.value;
                            }
                            else {
                                return typesStack[typesStack.length - 1].name;
                            }
                        }
                        return null;
                    })();
                    typesStack.push(schema.getType(nextTypeName));
                }
            },
            leave(node) {
                const selections = node.selections || [];
                if (schema && selections.length > 0) {
                    typesStack.pop();
                }
            },
        },
        Field: {
            enter: (node, key, parent, path, anscestors) => {
                if (node.name.value.startsWith('__')) {
                    return;
                }
                const insideIgnoredFragment = anscestors.find((f) => f.kind && f.kind === 'FragmentDefinition' && externalFragments.includes(f.name.value));
                if (insideIgnoredFragment) {
                    return;
                }
                const selections = node.selectionSet ? node.selectionSet.selections || [] : [];
                const relevantFragmentSpreads = selections.filter(s => s.kind === Kind.FRAGMENT_SPREAD && !externalFragments.includes(s.name.value));
                if (selections.length === 0 || relevantFragmentSpreads.length > 0) {
                    foundFields++;
                }
                if (schema) {
                    const lastType = typesStack[typesStack.length - 1];
                    if (lastType) {
                        if (isObjectType(lastType)) {
                            const field = lastType.getFields()[node.name.value];
                            if (!field) {
                                throw new Error(`Unable to find field "${node.name.value}" on type "${lastType}"!`);
                            }
                            const currentType = field.type;
                            // To handle `Maybe` usage
                            if (hasNullableTypeRecursively(currentType)) {
                                foundFields++;
                            }
                        }
                    }
                }
            },
        },
        enter: {
            VariableDefinition: (node, key, parent, path, anscestors) => {
                const insideIgnoredFragment = anscestors.find((f) => f.kind && f.kind === 'FragmentDefinition' && externalFragments.includes(f.name.value));
                if (insideIgnoredFragment) {
                    return;
                }
                foundFields++;
            },
            InputValueDefinition: (node, key, parent, path, anscestors) => {
                const insideIgnoredFragment = anscestors.find((f) => f.kind && f.kind === 'FragmentDefinition' && externalFragments.includes(f.name.value));
                if (insideIgnoredFragment) {
                    return;
                }
                foundFields++;
            },
        },
    });
    return foundFields > 0;
}

/**
 * Federation Spec
 */
const federationSpec = parse(/* GraphQL */ `
  scalar _FieldSet

  directive @external on FIELD_DEFINITION
  directive @requires(fields: _FieldSet!) on FIELD_DEFINITION
  directive @provides(fields: _FieldSet!) on FIELD_DEFINITION
  directive @key(fields: _FieldSet!) on OBJECT | INTERFACE
`);
/**
 * Adds `__resolveReference` in each ObjectType involved in Federation.
 * @param schema
 */
function addFederationReferencesToSchema(schema) {
    return mapSchema(schema, {
        [MapperKind.OBJECT_TYPE]: type => {
            if (isFederationObjectType(type, schema)) {
                const typeConfig = type.toConfig();
                typeConfig.fields = {
                    [resolveReferenceFieldName]: {
                        type,
                    },
                    ...typeConfig.fields,
                };
                return new GraphQLObjectType(typeConfig);
            }
            return type;
        },
    });
}
/**
 * Removes Federation Spec from GraphQL Schema
 * @param schema
 * @param config
 */
function removeFederation(schema) {
    return mapSchema(schema, {
        [MapperKind.QUERY]: queryType => {
            const queryTypeConfig = queryType.toConfig();
            delete queryTypeConfig.fields._entities;
            delete queryTypeConfig.fields._service;
            return new GraphQLObjectType(queryTypeConfig);
        },
        [MapperKind.UNION_TYPE]: unionType => {
            const unionTypeName = unionType.name;
            if (unionTypeName === '_Entity' || unionTypeName === '_Any') {
                return null;
            }
            return unionType;
        },
        [MapperKind.OBJECT_TYPE]: objectType => {
            if (objectType.name === '_Service') {
                return null;
            }
            return objectType;
        },
    });
}
const resolveReferenceFieldName = '__resolveReference';
class ApolloFederation {
    constructor({ enabled, schema }) {
        this.enabled = false;
        this.enabled = enabled;
        this.schema = schema;
        this.providesMap = this.createMapOfProvides();
    }
    /**
     * Excludes types definde by Federation
     * @param typeNames List of type names
     */
    filterTypeNames(typeNames) {
        return this.enabled ? typeNames.filter(t => t !== '_FieldSet') : typeNames;
    }
    /**
     * Excludes `__resolveReference` fields
     * @param fieldNames List of field names
     */
    filterFieldNames(fieldNames) {
        return this.enabled ? fieldNames.filter(t => t !== resolveReferenceFieldName) : fieldNames;
    }
    /**
     * Decides if directive should not be generated
     * @param name directive's name
     */
    skipDirective(name) {
        return this.enabled && ['external', 'requires', 'provides', 'key'].includes(name);
    }
    /**
     * Decides if scalar should not be generated
     * @param name directive's name
     */
    skipScalar(name) {
        return this.enabled && name === '_FieldSet';
    }
    /**
     * Decides if field should not be generated
     * @param data
     */
    skipField({ fieldNode, parentType }) {
        if (!this.enabled || !isObjectType(parentType) || !isFederationObjectType(parentType, this.schema)) {
            return false;
        }
        return this.isExternalAndNotProvided(fieldNode, parentType);
    }
    isResolveReferenceField(fieldNode) {
        const name = typeof fieldNode.name === 'string' ? fieldNode.name : fieldNode.name.value;
        return this.enabled && name === resolveReferenceFieldName;
    }
    /**
     * Transforms ParentType signature in ObjectTypes involved in Federation
     * @param data
     */
    transformParentType({ fieldNode, parentType, parentTypeSignature, }) {
        if (this.enabled &&
            isObjectType(parentType) &&
            isFederationObjectType(parentType, this.schema) &&
            (isTypeExtension(parentType, this.schema) || fieldNode.name.value === resolveReferenceFieldName)) {
            const keys = getDirectivesByName('key', parentType);
            if (keys.length) {
                const outputs = [`{ __typename: '${parentType.name}' } &`];
                // Look for @requires and see what the service needs and gets
                const requires = getDirectivesByName('requires', fieldNode).map(this.extractKeyOrRequiresFieldSet);
                const requiredFields = this.translateFieldSet(merge({}, ...requires), parentTypeSignature);
                // @key() @key() - "primary keys" in Federation
                const primaryKeys = keys.map(def => {
                    const fields = this.extractKeyOrRequiresFieldSet(def);
                    return this.translateFieldSet(fields, parentTypeSignature);
                });
                const [open, close] = primaryKeys.length > 1 ? ['(', ')'] : ['', ''];
                outputs.push([open, primaryKeys.join(' | '), close].join(''));
                // include required fields
                if (requires.length) {
                    outputs.push(`& ${requiredFields}`);
                }
                return outputs.join(' ');
            }
        }
        return parentTypeSignature;
    }
    isExternalAndNotProvided(fieldNode, objectType) {
        return this.isExternal(fieldNode) && !this.hasProvides(objectType, fieldNode);
    }
    isExternal(node) {
        return getDirectivesByName('external', node).length > 0;
    }
    hasProvides(objectType, node) {
        const fields = this.providesMap[isObjectType(objectType) ? objectType.name : objectType.name.value];
        if (fields && fields.length) {
            return fields.includes(node.name.value);
        }
        return false;
    }
    translateFieldSet(fields, parentTypeRef) {
        return `GraphQLRecursivePick<${parentTypeRef}, ${JSON.stringify(fields)}>`;
    }
    extractKeyOrRequiresFieldSet(directive) {
        const arg = directive.arguments.find(arg => arg.name.value === 'fields');
        const value = arg.value.value;
        return visit(parse(`{${value}}`), {
            leave: {
                SelectionSet(node) {
                    return node.selections.reduce((accum, field) => {
                        accum[field.name] = field.selection;
                        return accum;
                    }, {});
                },
                Field(node) {
                    return {
                        name: node.name.value,
                        selection: node.selectionSet ? node.selectionSet : true,
                    };
                },
                Document(node) {
                    return node.definitions.find((def) => def.kind === 'OperationDefinition' && def.operation === 'query').selectionSet;
                },
            },
        });
    }
    extractProvidesFieldSet(directive) {
        const arg = directive.arguments.find(arg => arg.name.value === 'fields');
        const value = arg.value.value;
        if (/[{}]/gi.test(value)) {
            throw new Error('Nested fields in _FieldSet is not supported in the @provides directive');
        }
        return value.split(/\s+/g);
    }
    createMapOfProvides() {
        const providesMap = {};
        Object.keys(this.schema.getTypeMap()).forEach(typename => {
            const objectType = this.schema.getType(typename);
            if (isObjectType(objectType)) {
                Object.values(objectType.getFields()).forEach(field => {
                    const provides = getDirectivesByName('provides', field.astNode)
                        .map(this.extractProvidesFieldSet)
                        .reduce((prev, curr) => [...prev, ...curr], []);
                    const ofType = getBaseType(field.type);
                    if (!providesMap[ofType.name]) {
                        providesMap[ofType.name] = [];
                    }
                    providesMap[ofType.name].push(...provides);
                });
            }
        });
        return providesMap;
    }
}
/**
 * Checks if Object Type is involved in Federation. Based on `@key` directive
 * @param node Type
 */
function isFederationObjectType(node, schema) {
    const { name: { value: name }, directives, } = isObjectType(node) ? astFromObjectType(node, schema) : node;
    const rootTypeNames = getRootTypeNames(schema);
    const isNotRoot = !rootTypeNames.includes(name);
    const isNotIntrospection = !name.startsWith('__');
    const hasKeyDirective = directives.some(d => d.name.value === 'key');
    return isNotRoot && isNotIntrospection && hasKeyDirective;
}
/**
 * Extracts directives from a node based on directive's name
 * @param name directive name
 * @param node ObjectType or Field
 */
function getDirectivesByName(name, node) {
    var _a;
    let astNode;
    if (isObjectType(node)) {
        astNode = node.astNode;
    }
    else {
        astNode = node;
    }
    return ((_a = astNode === null || astNode === void 0 ? void 0 : astNode.directives) === null || _a === void 0 ? void 0 : _a.filter(d => d.name.value === name)) || [];
}
/**
 * Checks if the Object Type extends a federated type from a remote schema.
 * Based on if any of its fields contain the `@external` directive
 * @param node Type
 */
function isTypeExtension(node, schema) {
    var _a;
    const definition = isObjectType(node) ? node.astNode || astFromObjectType(node, schema) : node;
    return (_a = definition.fields) === null || _a === void 0 ? void 0 : _a.some(field => getDirectivesByName('external', field).length);
}

class DetailedError extends Error {
    constructor(message, details, source) {
        super(message);
        this.message = message;
        this.details = details;
        this.source = source;
        Object.setPrototypeOf(this, DetailedError.prototype);
        Error.captureStackTrace(this, DetailedError);
    }
}
function isDetailedError(error) {
    return error.details;
}

const schemaDocumentNodeCache = new WeakMap();
function getCachedDocumentNodeFromSchema(schema) {
    let documentNode = schemaDocumentNodeCache.get(schema);
    if (!documentNode) {
        documentNode = getDocumentNodeFromSchema(schema);
        schemaDocumentNodeCache.set(schema, documentNode);
    }
    return documentNode;
}

export { ApolloFederation, DetailedError, addFederationReferencesToSchema, federationSpec, getBaseType, getCachedDocumentNodeFromSchema, hasNullableTypeRecursively, isComplexPluginOutput, isConfiguredOutput, isDetailedError, isOutputConfigArray, isUsingTypes, isWrapperType, mergeOutputs, normalizeConfig, normalizeInstanceOrArray, normalizeOutputParam, removeFederation, removeNonNullWrapper, resolveExternalModuleAndFn };
