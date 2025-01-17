'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

const graphql = require('graphql');
const visitorPluginCommon = require('@graphql-codegen/visitor-plugin-common');
const autoBind = _interopDefault(require('auto-bind'));
const pluginHelpers = require('@graphql-codegen/plugin-helpers');
require('path');
require('graphql/jsutils/inspect.js');
require('graphql/language/blockString.js');
require('graphql/execution/execute.js');

class TypeScriptOperationVariablesToObject extends visitorPluginCommon.OperationVariablesToObject {
    constructor(_scalars, _convertName, _avoidOptionals, _immutableTypes, _namespacedImportName = null, _enumNames = [], _enumPrefix = true, _enumValues = {}, _applyCoercion = false) {
        super(_scalars, _convertName, _namespacedImportName, _enumNames, _enumPrefix, _enumValues, _applyCoercion);
        this._avoidOptionals = _avoidOptionals;
        this._immutableTypes = _immutableTypes;
    }
    clearOptional(str) {
        const prefix = this._namespacedImportName ? `${this._namespacedImportName}.` : '';
        const rgx = new RegExp(`^${this.wrapMaybe(`(.*?)`)}$`, 'i');
        if (str.startsWith(`${prefix}Maybe`)) {
            return str.replace(rgx, '$1');
        }
        return str;
    }
    wrapAstTypeWithModifiers(baseType, typeNode, applyCoercion = false) {
        if (typeNode.kind === graphql.Kind.NON_NULL_TYPE) {
            const type = this.wrapAstTypeWithModifiers(baseType, typeNode.type, applyCoercion);
            return this.clearOptional(type);
        }
        else if (typeNode.kind === graphql.Kind.LIST_TYPE) {
            const innerType = this.wrapAstTypeWithModifiers(baseType, typeNode.type, applyCoercion);
            const listInputCoercionExtension = applyCoercion ? ` | ${innerType}` : '';
            return this.wrapMaybe(`${this._immutableTypes ? 'ReadonlyArray' : 'Array'}<${innerType}>${listInputCoercionExtension}`);
        }
        else {
            return this.wrapMaybe(baseType);
        }
    }
    formatFieldString(fieldName, isNonNullType, hasDefaultValue) {
        return `${fieldName}${this.getAvoidOption(isNonNullType, hasDefaultValue) ? '?' : ''}`;
    }
    formatTypeString(fieldType, isNonNullType, hasDefaultValue) {
        if (!hasDefaultValue && isNonNullType) {
            return this.clearOptional(fieldType);
        }
        return fieldType;
    }
    wrapMaybe(type) {
        const prefix = this._namespacedImportName ? `${this._namespacedImportName}.` : '';
        return `${prefix}Maybe${type ? `<${type}>` : ''}`;
    }
    getAvoidOption(isNonNullType, hasDefaultValue) {
        const options = visitorPluginCommon.normalizeAvoidOptionals(this._avoidOptionals);
        return ((options.object || !options.defaultValue) && hasDefaultValue) || (!options.object && !isNonNullType);
    }
    getPunctuation() {
        return ';';
    }
}

const EXACT_SIGNATURE = `type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };`;
const MAKE_OPTIONAL_SIGNATURE = `type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };`;
const MAKE_MAYBE_SIGNATURE = `type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };`;
class TsVisitor extends visitorPluginCommon.BaseTypesVisitor {
    constructor(schema, pluginConfig, additionalConfig = {}) {
        super(schema, pluginConfig, {
            noExport: visitorPluginCommon.getConfigValue(pluginConfig.noExport, false),
            avoidOptionals: visitorPluginCommon.normalizeAvoidOptionals(visitorPluginCommon.getConfigValue(pluginConfig.avoidOptionals, false)),
            maybeValue: visitorPluginCommon.getConfigValue(pluginConfig.maybeValue, 'T | null'),
            constEnums: visitorPluginCommon.getConfigValue(pluginConfig.constEnums, false),
            enumsAsTypes: visitorPluginCommon.getConfigValue(pluginConfig.enumsAsTypes, false),
            futureProofEnums: visitorPluginCommon.getConfigValue(pluginConfig.futureProofEnums, false),
            futureProofUnions: visitorPluginCommon.getConfigValue(pluginConfig.futureProofUnions, false),
            enumsAsConst: visitorPluginCommon.getConfigValue(pluginConfig.enumsAsConst, false),
            numericEnums: visitorPluginCommon.getConfigValue(pluginConfig.numericEnums, false),
            onlyOperationTypes: visitorPluginCommon.getConfigValue(pluginConfig.onlyOperationTypes, false),
            immutableTypes: visitorPluginCommon.getConfigValue(pluginConfig.immutableTypes, false),
            useImplementingTypes: visitorPluginCommon.getConfigValue(pluginConfig.useImplementingTypes, false),
            entireFieldWrapperValue: visitorPluginCommon.getConfigValue(pluginConfig.entireFieldWrapperValue, 'T'),
            wrapEntireDefinitions: visitorPluginCommon.getConfigValue(pluginConfig.wrapEntireFieldDefinitions, false),
            ...(additionalConfig || {}),
        });
        autoBind(this);
        const enumNames = Object.values(schema.getTypeMap())
            .filter(graphql.isEnumType)
            .map(type => type.name);
        this.setArgumentsTransformer(new TypeScriptOperationVariablesToObject(this.scalars, this.convertName, this.config.avoidOptionals, this.config.immutableTypes, null, enumNames, pluginConfig.enumPrefix, this.config.enumValues));
        this.setDeclarationBlockConfig({
            enumNameValueSeparator: ' =',
            ignoreExport: this.config.noExport,
        });
    }
    _getTypeForNode(node) {
        const typeAsString = node.name;
        if (this.config.useImplementingTypes) {
            const allTypesMap = this._schema.getTypeMap();
            const implementingTypes = [];
            // TODO: Move this to a better place, since we are using this logic in some other places as well.
            for (const graphqlType of Object.values(allTypesMap)) {
                if (graphqlType instanceof graphql.GraphQLObjectType) {
                    const allInterfaces = graphqlType.getInterfaces();
                    if (allInterfaces.some(int => typeAsString === int.name)) {
                        implementingTypes.push(this.convertName(graphqlType.name));
                    }
                }
            }
            if (implementingTypes.length > 0) {
                return implementingTypes.join(' | ');
            }
        }
        const typeString = super._getTypeForNode(node);
        if (this.config.allowEnumStringTypes === true) {
            const schemaType = this._schema.getType(node.name);
            if (graphql.isEnumType(schemaType)) {
                return `${typeString} | ` + '`${' + typeString + '}`';
            }
        }
        return typeString;
    }
    getWrapperDefinitions() {
        const definitions = [
            this.getMaybeValue(),
            this.getExactDefinition(),
            this.getMakeOptionalDefinition(),
            this.getMakeMaybeDefinition(),
        ];
        if (this.config.wrapFieldDefinitions) {
            definitions.push(this.getFieldWrapperValue());
        }
        if (this.config.wrapEntireDefinitions) {
            definitions.push(this.getEntireFieldWrapperValue());
        }
        return definitions;
    }
    getExactDefinition() {
        return `${this.getExportPrefix()}${EXACT_SIGNATURE}`;
    }
    getMakeOptionalDefinition() {
        return `${this.getExportPrefix()}${MAKE_OPTIONAL_SIGNATURE}`;
    }
    getMakeMaybeDefinition() {
        return `${this.getExportPrefix()}${MAKE_MAYBE_SIGNATURE}`;
    }
    getMaybeValue() {
        return `${this.getExportPrefix()}type Maybe<T> = ${this.config.maybeValue};`;
    }
    clearOptional(str) {
        if (str.startsWith('Maybe')) {
            return str.replace(/Maybe<(.*?)>$/, '$1');
        }
        return str;
    }
    getExportPrefix() {
        if (this.config.noExport) {
            return '';
        }
        return super.getExportPrefix();
    }
    NamedType(node, key, parent, path, ancestors) {
        return `Maybe<${super.NamedType(node, key, parent, path, ancestors)}>`;
    }
    ListType(node) {
        return `Maybe<${super.ListType(node)}>`;
    }
    UnionTypeDefinition(node, key, parent) {
        if (this.config.onlyOperationTypes)
            return '';
        let withFutureAddedValue = [];
        if (this.config.futureProofUnions) {
            withFutureAddedValue = [
                this.config.immutableTypes ? `{ readonly __typename?: "%other" }` : `{ __typename?: "%other" }`,
            ];
        }
        const originalNode = parent[key];
        const possibleTypes = originalNode.types
            .map(t => (this.scalars[t.name.value] ? this._getScalar(t.name.value) : this.convertName(t)))
            .concat(...withFutureAddedValue)
            .join(' | ');
        return new visitorPluginCommon.DeclarationBlock(this._declarationBlockConfig)
            .export()
            .asKind('type')
            .withName(this.convertName(node))
            .withComment(node.description)
            .withContent(possibleTypes).string;
        // return super.UnionTypeDefinition(node, key, parent).concat(withFutureAddedValue).join("");
    }
    wrapWithListType(str) {
        return `${this.config.immutableTypes ? 'ReadonlyArray' : 'Array'}<${str}>`;
    }
    NonNullType(node) {
        const baseValue = super.NonNullType(node);
        return this.clearOptional(baseValue);
    }
    FieldDefinition(node, key, parent) {
        const typeString = this.config.wrapEntireDefinitions
            ? `EntireFieldWrapper<${node.type}>`
            : node.type;
        const originalFieldNode = parent[key];
        const addOptionalSign = !this.config.avoidOptionals.field && originalFieldNode.type.kind !== graphql.Kind.NON_NULL_TYPE;
        const comment = this.getFieldComment(node);
        const { type } = this.config.declarationKind;
        return (comment +
            visitorPluginCommon.indent(`${this.config.immutableTypes ? 'readonly ' : ''}${node.name}${addOptionalSign ? '?' : ''}: ${typeString}${this.getPunctuation(type)}`));
    }
    InputValueDefinition(node, key, parent) {
        const originalFieldNode = parent[key];
        const addOptionalSign = !this.config.avoidOptionals.inputValue &&
            (originalFieldNode.type.kind !== graphql.Kind.NON_NULL_TYPE ||
                (!this.config.avoidOptionals.defaultValue && node.defaultValue !== undefined));
        const comment = visitorPluginCommon.transformComment(node.description, 1);
        const { type } = this.config.declarationKind;
        return (comment +
            visitorPluginCommon.indent(`${this.config.immutableTypes ? 'readonly ' : ''}${node.name}${addOptionalSign ? '?' : ''}: ${node.type}${this.getPunctuation(type)}`));
    }
    EnumTypeDefinition(node) {
        const enumName = node.name;
        // In case of mapped external enum string
        if (this.config.enumValues[enumName] && this.config.enumValues[enumName].sourceFile) {
            return `export { ${this.config.enumValues[enumName].typeIdentifier} };\n`;
        }
        const getValueFromConfig = (enumValue) => {
            if (this.config.enumValues[enumName] &&
                this.config.enumValues[enumName].mappedValues &&
                typeof this.config.enumValues[enumName].mappedValues[enumValue] !== 'undefined') {
                return this.config.enumValues[enumName].mappedValues[enumValue];
            }
            return null;
        };
        const withFutureAddedValue = [
            this.config.futureProofEnums ? [visitorPluginCommon.indent('| ' + visitorPluginCommon.wrapWithSingleQuotes('%future added value'))] : [],
        ];
        const enumTypeName = this.convertName(node, { useTypesPrefix: this.config.enumPrefix });
        if (this.config.enumsAsTypes) {
            return new visitorPluginCommon.DeclarationBlock(this._declarationBlockConfig)
                .export()
                .asKind('type')
                .withComment(node.description)
                .withName(enumTypeName)
                .withContent('\n' +
                node.values
                    .map(enumOption => {
                    var _a;
                    const name = enumOption.name;
                    const enumValue = (_a = getValueFromConfig(name)) !== null && _a !== void 0 ? _a : name;
                    const comment = visitorPluginCommon.transformComment(enumOption.description, 1);
                    return comment + visitorPluginCommon.indent('| ' + visitorPluginCommon.wrapWithSingleQuotes(enumValue));
                })
                    .concat(...withFutureAddedValue)
                    .join('\n')).string;
        }
        if (this.config.numericEnums) {
            const block = new visitorPluginCommon.DeclarationBlock(this._declarationBlockConfig)
                .export()
                .withComment(node.description)
                .withName(enumTypeName)
                .asKind('enum')
                .withBlock(node.values
                .map((enumOption, i) => {
                const valueFromConfig = getValueFromConfig(enumOption.name);
                const enumValue = valueFromConfig !== null && valueFromConfig !== void 0 ? valueFromConfig : i;
                const comment = visitorPluginCommon.transformComment(enumOption.description, 1);
                return comment + visitorPluginCommon.indent(enumOption.name) + ` = ${enumValue}`;
            })
                .concat(...withFutureAddedValue)
                .join(',\n')).string;
            return block;
        }
        if (this.config.enumsAsConst) {
            const typeName = `export type ${enumTypeName} = typeof ${enumTypeName}[keyof typeof ${enumTypeName}];`;
            const enumAsConst = new visitorPluginCommon.DeclarationBlock({
                ...this._declarationBlockConfig,
                blockTransformer: block => {
                    return block + ' as const';
                },
            })
                .export()
                .asKind('const')
                .withName(enumTypeName)
                .withComment(node.description)
                .withBlock(node.values
                .map(enumOption => {
                var _a;
                const optionName = this.convertName(enumOption, { useTypesPrefix: false, transformUnderscore: true });
                const comment = visitorPluginCommon.transformComment(enumOption.description, 1);
                const name = enumOption.name;
                const enumValue = (_a = getValueFromConfig(name)) !== null && _a !== void 0 ? _a : name;
                return comment + visitorPluginCommon.indent(`${optionName}: ${visitorPluginCommon.wrapWithSingleQuotes(enumValue)}`);
            })
                .join(',\n')).string;
            return [enumAsConst, typeName].join('\n');
        }
        return new visitorPluginCommon.DeclarationBlock(this._declarationBlockConfig)
            .export()
            .asKind(this.config.constEnums ? 'const enum' : 'enum')
            .withName(enumTypeName)
            .withComment(node.description)
            .withBlock(this.buildEnumValuesBlock(enumName, node.values)).string;
    }
    getPunctuation(_declarationKind) {
        return ';';
    }
}

class TsIntrospectionVisitor extends TsVisitor {
    constructor(schema, pluginConfig = {}, typesToInclude) {
        super(schema, pluginConfig);
        this.typesToInclude = [];
        this.typesToInclude = typesToInclude;
        autoBind(this);
    }
    DirectiveDefinition() {
        return null;
    }
    ObjectTypeDefinition(node, key, parent) {
        const name = node.name;
        if (this.typesToInclude.some(type => type.name === name)) {
            return super.ObjectTypeDefinition(node, key, parent);
        }
        return null;
    }
    EnumTypeDefinition(node) {
        const name = node.name;
        if (this.typesToInclude.some(type => type.name === name)) {
            return super.EnumTypeDefinition(node);
        }
        return null;
    }
}

function transformSchemaAST(schema, config) {
    const astNode = pluginHelpers.getCachedDocumentNodeFromSchema(schema);
    const transformedAST = config.disableDescriptions
        ? graphql.visit(astNode, {
            leave: node => ({
                ...node,
                description: undefined,
            }),
        })
        : astNode;
    const transformedSchema = config.disableDescriptions ? graphql.buildASTSchema(transformedAST) : schema;
    return {
        schema: transformedSchema,
        ast: transformedAST,
    };
}

const plugin = (schema, documents, config) => {
    const { schema: _schema, ast } = transformSchemaAST(schema, config);
    const visitor = new TsVisitor(_schema, config);
    const visitorResult = graphql.visit(ast, { leave: visitor });
    const introspectionDefinitions = includeIntrospectionDefinitions(_schema, documents, config);
    const scalars = visitor.scalarsDefinition;
    return {
        prepend: [...visitor.getEnumsImports(), ...visitor.getScalarsImports(), ...visitor.getWrapperDefinitions()],
        content: [scalars, ...visitorResult.definitions, ...introspectionDefinitions].join('\n'),
    };
};
function includeIntrospectionDefinitions(schema, documents, config) {
    const typeInfo = new graphql.TypeInfo(schema);
    const usedTypes = [];
    const documentsVisitor = graphql.visitWithTypeInfo(typeInfo, {
        Field() {
            const type = graphql.getNamedType(typeInfo.getType());
            if (graphql.isIntrospectionType(type) && !usedTypes.includes(type)) {
                usedTypes.push(type);
            }
        },
    });
    documents.forEach(doc => graphql.visit(doc.document, documentsVisitor));
    const typesToInclude = [];
    usedTypes.forEach(type => {
        collectTypes(type);
    });
    const visitor = new TsIntrospectionVisitor(schema, config, typesToInclude);
    const result = graphql.visit(graphql.parse(graphql.printIntrospectionSchema(schema)), { leave: visitor });
    // recursively go through each `usedTypes` and their children and collect all used types
    // we don't care about Interfaces, Unions and others, but Objects and Enums
    function collectTypes(type) {
        if (typesToInclude.includes(type)) {
            return;
        }
        typesToInclude.push(type);
        if (graphql.isObjectType(type)) {
            const fields = type.getFields();
            Object.keys(fields).forEach(key => {
                const field = fields[key];
                const type = graphql.getNamedType(field.type);
                collectTypes(type);
            });
        }
    }
    return result.definitions;
}

exports.EXACT_SIGNATURE = EXACT_SIGNATURE;
exports.MAKE_MAYBE_SIGNATURE = MAKE_MAYBE_SIGNATURE;
exports.MAKE_OPTIONAL_SIGNATURE = MAKE_OPTIONAL_SIGNATURE;
exports.TsIntrospectionVisitor = TsIntrospectionVisitor;
exports.TsVisitor = TsVisitor;
exports.TypeScriptOperationVariablesToObject = TypeScriptOperationVariablesToObject;
exports.includeIntrospectionDefinitions = includeIntrospectionDefinitions;
exports.plugin = plugin;
