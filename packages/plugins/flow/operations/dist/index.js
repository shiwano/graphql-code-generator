'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

const graphql = require('graphql');
const visitorPluginCommon = require('@graphql-codegen/visitor-plugin-common');
const flow = require('@graphql-codegen/flow');
const autoBind = _interopDefault(require('auto-bind'));

class FlowWithPickSelectionSetProcessor extends visitorPluginCommon.BaseSelectionSetProcessor {
    transformAliasesPrimitiveFields(schemaType, fields) {
        if (fields.length === 0) {
            return [];
        }
        const useFlowExactObject = this.config.useFlowExactObjects;
        const formatNamedField = this.config.formatNamedField;
        const fieldObj = schemaType.getFields();
        const parentName = (this.config.namespacedImportName ? `${this.config.namespacedImportName}.` : '') +
            this.config.convertName(schemaType.name, {
                useTypesPrefix: true,
            });
        return [
            `{${useFlowExactObject ? '|' : ''} ${fields
                .map(aliasedField => `${formatNamedField(aliasedField.alias, fieldObj[aliasedField.fieldName].type)}: $ElementType<${parentName}, '${aliasedField.fieldName}'>`)
                .join(', ')} ${useFlowExactObject ? '|' : ''}}`,
        ];
    }
    buildFieldsIntoObject(allObjectsMerged) {
        return `...{ ${allObjectsMerged.join(', ')} }`;
    }
    buildSelectionSetFromStrings(pieces) {
        if (pieces.length === 0) {
            return null;
        }
        else if (pieces.length === 1) {
            return pieces[0];
        }
        else {
            return `({\n  ${pieces.map(t => visitorPluginCommon.indent(`...${t}`)).join(`,\n`)}\n})`;
        }
    }
    transformLinkFields(fields) {
        if (fields.length === 0) {
            return [];
        }
        const useFlowExactObject = this.config.useFlowExactObjects;
        return [
            `{${useFlowExactObject ? '|' : ''} ${fields
                .map(field => `${field.alias || field.name}: ${field.selectionSet}`)
                .join(', ')} ${useFlowExactObject ? '|' : ''}}`,
        ];
    }
    transformPrimitiveFields(schemaType, fields) {
        if (fields.length === 0) {
            return [];
        }
        const useFlowExactObject = this.config.useFlowExactObjects;
        const formatNamedField = this.config.formatNamedField;
        const parentName = (this.config.namespacedImportName ? `${this.config.namespacedImportName}.` : '') +
            this.config.convertName(schemaType.name, {
                useTypesPrefix: true,
            });
        const fieldObj = schemaType.getFields();
        let hasConditionals = false;
        const conditilnalsList = [];
        let resString = `$Pick<${parentName}, {${useFlowExactObject ? '|' : ''} ${fields
            .map(field => {
            if (field.isConditional) {
                hasConditionals = true;
                conditilnalsList.push(field.fieldName);
            }
            return `${formatNamedField(field.fieldName, fieldObj[field.fieldName].type)}: *`;
        })
            .join(', ')} ${useFlowExactObject ? '|' : ''}}>`;
        if (hasConditionals) {
            resString = `$MakeOptional<${resString}, ${conditilnalsList.map(field => `{ ${field}: * }`).join(' | ')}>`;
        }
        return [resString];
    }
    transformTypenameField(type, name) {
        return [`{ ${name}: ${type} }`];
    }
}

class FlowSelectionSetToObject extends visitorPluginCommon.SelectionSetToObject {
    getUnknownType() {
        return 'any';
    }
    createNext(parentSchemaType, selectionSet) {
        return new FlowSelectionSetToObject(this._processor, this._scalars, this._schema, this._convertName.bind(this), this._getFragmentSuffix.bind(this), this._loadedFragments, this._config, parentSchemaType, selectionSet);
    }
}
class FlowDocumentsVisitor extends visitorPluginCommon.BaseDocumentsVisitor {
    constructor(schema, config, allFragments) {
        super(config, {
            useFlowExactObjects: visitorPluginCommon.getConfigValue(config.useFlowExactObjects, true),
            useFlowReadOnlyTypes: visitorPluginCommon.getConfigValue(config.useFlowReadOnlyTypes, false),
        }, schema);
        autoBind(this);
        const wrapArray = (type) => `${this.config.useFlowReadOnlyTypes ? '$ReadOnlyArray' : 'Array'}<${type}>`;
        const wrapOptional = (type) => `?${type}`;
        const useFlowReadOnlyTypes = this.config.useFlowReadOnlyTypes;
        const formatNamedField = (name, type, isConditional = false) => {
            const optional = (!!type && !graphql.isNonNullType(type)) || isConditional;
            return `${useFlowReadOnlyTypes ? '+' : ''}${name}${optional ? '?' : ''}`;
        };
        const processorConfig = {
            namespacedImportName: this.config.namespacedImportName,
            convertName: this.convertName.bind(this),
            enumPrefix: this.config.enumPrefix,
            scalars: this.scalars,
            formatNamedField,
            wrapTypeWithModifiers(baseType, type) {
                return visitorPluginCommon.wrapTypeWithModifiers(baseType, type, { wrapOptional, wrapArray });
            },
        };
        const processor = config.preResolveTypes
            ? new visitorPluginCommon.PreResolveTypesProcessor(processorConfig)
            : new FlowWithPickSelectionSetProcessor({
                ...processorConfig,
                useFlowExactObjects: this.config.useFlowExactObjects,
            });
        const enumsNames = Object.keys(schema.getTypeMap()).filter(typeName => graphql.isEnumType(schema.getType(typeName)));
        this.setSelectionSetHandler(new FlowSelectionSetToObject(processor, this.scalars, this.schema, this.convertName.bind(this), this.getFragmentSuffix.bind(this), allFragments, this.config));
        this.setVariablesTransformer(new flow.FlowOperationVariablesToObject(this.scalars, this.convertName.bind(this), this.config.namespacedImportName, enumsNames, this.config.enumPrefix, {}, true));
    }
    getPunctuation(declarationKind) {
        return declarationKind === 'type' ? ',' : ';';
    }
    getImports() {
        return !this.config.globalNamespace && !this.config.inlineFragmentTypes
            ? this.config.fragmentImports
                // In flow, all non ` * as x` imports must be type imports
                .map(fragmentImport => ({ ...fragmentImport, typesImport: true }))
                .map(fragmentImport => visitorPluginCommon.generateFragmentImportStatement(fragmentImport, 'type'))
            : [];
    }
}

const plugin = (schema, rawDocuments, config) => {
    const documents = config.flattenGeneratedTypes
        ? visitorPluginCommon.optimizeOperations(schema, rawDocuments, { includeFragments: true })
        : rawDocuments;
    const prefix = config.preResolveTypes
        ? ''
        : `type $Pick<Origin: Object, Keys: Object> = $ObjMapi<Keys, <Key>(k: Key) => $ElementType<Origin, Key>>;\n`;
    const allAst = graphql.concatAST(documents.map(v => v.document));
    const includedFragments = allAst.definitions.filter(d => d.kind === graphql.Kind.FRAGMENT_DEFINITION);
    const allFragments = [
        ...includedFragments.map(fragmentDef => ({
            node: fragmentDef,
            name: fragmentDef.name.value,
            onType: fragmentDef.typeCondition.name.value,
            isExternal: false,
        })),
        ...(config.externalFragments || []),
    ];
    const visitor = new FlowDocumentsVisitor(schema, config, allFragments);
    const visitorResult = graphql.visit(allAst, {
        leave: visitor,
    });
    return {
        prepend: ['// @flow\n', ...visitor.getImports()],
        content: [prefix, ...visitorResult.definitions].join('\n'),
    };
};

exports.plugin = plugin;
