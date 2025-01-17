import { FieldsTree } from './fields-tree';
import { getBaseTypeNode, DeclarationBlock, getConfigValue, BaseVisitor, buildScalarsFromConfig, } from '@graphql-codegen/visitor-plugin-common';
import autoBind from 'auto-bind';
import { Directives } from './config';
import { Kind, isEnumType, } from 'graphql';
import { wrapTypeNodeWithModifiers } from '@graphql-codegen/visitor-plugin-common';
function resolveObjectId(pointer) {
    if (!pointer) {
        return { identifier: 'ObjectID', module: 'mongodb' };
    }
    if (pointer.includes('#')) {
        const [path, module] = pointer.split('#');
        return { identifier: path, module };
    }
    return {
        identifier: pointer,
        module: null,
    };
}
export class TsMongoVisitor extends BaseVisitor {
    constructor(_schema, pluginConfig) {
        super(pluginConfig, {
            dbTypeSuffix: pluginConfig.dbTypeSuffix || 'DbObject',
            dbInterfaceSuffix: pluginConfig.dbInterfaceSuffix || 'DbInterface',
            objectIdType: resolveObjectId(pluginConfig.objectIdType).identifier,
            objectIdImport: resolveObjectId(pluginConfig.objectIdType).module,
            idFieldName: pluginConfig.idFieldName || '_id',
            enumsAsString: getConfigValue(pluginConfig.enumsAsString, true),
            avoidOptionals: getConfigValue(pluginConfig.avoidOptionals, false),
            scalars: buildScalarsFromConfig(_schema, pluginConfig),
        });
        this._schema = _schema;
        autoBind(this);
    }
    get objectIdImport() {
        if (this.config.objectIdImport === null) {
            return null;
        }
        return `import { ${this.config.objectIdType} } from '${this.config.objectIdImport}';`;
    }
    _resolveDirectiveValue(valueNode) {
        switch (valueNode.kind) {
            case Kind.INT:
            case Kind.STRING:
            case Kind.FLOAT:
            case Kind.BOOLEAN:
            case Kind.ENUM:
                return valueNode.value;
            case Kind.LIST:
                return valueNode.values.map(v => this._resolveDirectiveValue(v));
            case Kind.NULL:
                return null;
            case Kind.OBJECT:
                return valueNode.fields.reduce((prev, f) => {
                    return {
                        ...prev,
                        [f.name.value]: this._resolveDirectiveValue(f.value),
                    };
                }, {});
            default:
                return undefined;
        }
    }
    _getDirectiveArgValue(node, argName) {
        if (!node || !node.arguments || node.arguments.length === 0) {
            return undefined;
        }
        const foundArgument = node.arguments.find(a => a.name.value === argName);
        if (!foundArgument) {
            return undefined;
        }
        return this._resolveDirectiveValue(foundArgument.value);
    }
    _getDirectiveFromAstNode(node, directiveName) {
        if (!node || !node.directives || node.directives.length === 0) {
            return null;
        }
        const foundDirective = node.directives.find(d => d.name === directiveName || (d.name.value && d.name.value === directiveName));
        if (!foundDirective) {
            return null;
        }
        return foundDirective;
    }
    _buildInterfaces(interfaces) {
        return (interfaces || [])
            .map(namedType => {
            const schemaType = this._schema.getType(namedType.name.value);
            const abstractEntityDirective = this._getDirectiveFromAstNode(schemaType.astNode, Directives.ABSTRACT_ENTITY);
            if (!abstractEntityDirective) {
                return null;
            }
            return this.convertName(namedType.name.value, { suffix: this.config.dbInterfaceSuffix });
        })
            .filter(a => a);
    }
    _handleIdField(fieldNode, tree, addOptionalSign) {
        tree.addField(`${this.config.idFieldName}${addOptionalSign ? '?' : ''}`, wrapTypeNodeWithModifiers(this.config.objectIdType, fieldNode.type));
    }
    _handleLinkField(fieldNode, tree, linkDirective, mapPath, addOptionalSign) {
        const overrideType = this._getDirectiveArgValue(linkDirective, 'overrideType');
        const coreType = overrideType || getBaseTypeNode(fieldNode.type);
        const type = this.convertName(coreType, { suffix: this.config.dbTypeSuffix });
        tree.addField(`${mapPath || fieldNode.name.value}${addOptionalSign ? '?' : ''}`, wrapTypeNodeWithModifiers(`${type}['${this.config.idFieldName}']`, fieldNode.type));
    }
    _handleColumnField(fieldNode, tree, columnDirective, mapPath, addOptionalSign) {
        const overrideType = this._getDirectiveArgValue(columnDirective, 'overrideType');
        const coreType = getBaseTypeNode(fieldNode.type);
        let type = null;
        if (this.scalars[coreType.name.value]) {
            type = this.scalars[coreType.name.value];
        }
        else {
            const schemaType = this._schema.getType(coreType.name.value);
            if (isEnumType(schemaType) && this.config.enumsAsString) {
                type = this.scalars.String;
            }
            else {
                type = coreType.name.value;
            }
        }
        tree.addField(`${mapPath || fieldNode.name.value}${addOptionalSign ? '?' : ''}`, overrideType || wrapTypeNodeWithModifiers(type, fieldNode.type));
    }
    _handleEmbeddedField(fieldNode, tree, mapPath, addOptionalSign) {
        const coreType = getBaseTypeNode(fieldNode.type);
        const type = this.convertName(coreType, { suffix: this.config.dbTypeSuffix });
        tree.addField(`${mapPath || fieldNode.name.value}${addOptionalSign ? '?' : ''}`, wrapTypeNodeWithModifiers(type, fieldNode.type));
    }
    _buildFieldsTree(fields) {
        const tree = new FieldsTree();
        fields.forEach(field => {
            const idDirective = this._getDirectiveFromAstNode(field, Directives.ID);
            const linkDirective = this._getDirectiveFromAstNode(field, Directives.LINK);
            const columnDirective = this._getDirectiveFromAstNode(field, Directives.COLUMN);
            const embeddedDirective = this._getDirectiveFromAstNode(field, Directives.EMBEDDED);
            const mapDirective = this._getDirectiveFromAstNode(field, Directives.MAP);
            const mapPath = this._getDirectiveArgValue(mapDirective, 'path');
            const addOptionalSign = !this.config.avoidOptionals && field.type.kind !== Kind.NON_NULL_TYPE;
            if (idDirective) {
                this._handleIdField(field, tree, addOptionalSign);
            }
            else if (linkDirective) {
                this._handleLinkField(field, tree, linkDirective, mapPath, addOptionalSign);
            }
            else if (columnDirective) {
                this._handleColumnField(field, tree, columnDirective, mapPath, addOptionalSign);
            }
            else if (embeddedDirective) {
                this._handleEmbeddedField(field, tree, mapPath, addOptionalSign);
            }
        });
        return tree;
    }
    _addAdditionalFields(tree, additioalFields) {
        const avoidOptionals = this.config.avoidOptionals;
        if (!additioalFields || additioalFields.length === 0) {
            return;
        }
        for (const field of additioalFields) {
            const isOptional = field.path.includes('?');
            tree.addField(`${isOptional && avoidOptionals ? field.path.replace(/\?/g, '') : field.path}`, field.type);
        }
    }
    InterfaceTypeDefinition(node) {
        const abstractEntityDirective = this._getDirectiveFromAstNode(node, Directives.ABSTRACT_ENTITY);
        if (abstractEntityDirective === null) {
            return null;
        }
        const discriminatorField = this._getDirectiveArgValue(abstractEntityDirective, 'discriminatorField');
        const additionalFields = this._getDirectiveArgValue(abstractEntityDirective, 'additionalFields');
        const fields = this._buildFieldsTree(node.fields);
        fields.addField(discriminatorField, this.scalars.String);
        this._addAdditionalFields(fields, additionalFields);
        return new DeclarationBlock(this._declarationBlockConfig)
            .export()
            .asKind('type')
            .withName(this.convertName(node, { suffix: this.config.dbInterfaceSuffix }))
            .withBlock(fields.string).string;
    }
    UnionTypeDefinition(node) {
        const unionDirective = this._getDirectiveFromAstNode(node, Directives.UNION);
        if (unionDirective === null) {
            return null;
        }
        const discriminatorField = this._getDirectiveArgValue(unionDirective, 'discriminatorField');
        const possibleTypes = node.types
            .map(namedType => {
            const schemaType = this._schema.getType(namedType.name.value);
            const entityDirective = this._getDirectiveFromAstNode(schemaType.astNode, Directives.ENTITY);
            const abstractEntityDirective = this._getDirectiveFromAstNode(schemaType.astNode, Directives.ABSTRACT_ENTITY);
            if (entityDirective) {
                return this.convertName(namedType, { suffix: this.config.dbTypeSuffix });
            }
            else if (abstractEntityDirective) {
                return this.convertName(namedType, { suffix: this.config.dbInterfaceSuffix });
            }
            return null;
        })
            .filter(a => a);
        if (possibleTypes.length === 0) {
            return null;
        }
        const additionalFields = this._getDirectiveArgValue(unionDirective, 'additionalFields');
        const fields = new FieldsTree();
        fields.addField(discriminatorField, this.scalars.String);
        this._addAdditionalFields(fields, additionalFields);
        return new DeclarationBlock(this._declarationBlockConfig)
            .export()
            .asKind('type')
            .withName(this.convertName(node, { suffix: this.config.dbTypeSuffix }))
            .withContent(`(${possibleTypes.join(' | ')}) & `)
            .withBlock(fields.string).string;
    }
    ObjectTypeDefinition(node) {
        const entityDirective = this._getDirectiveFromAstNode(node, Directives.ENTITY);
        if (entityDirective === null) {
            return null;
        }
        const implementingInterfaces = this._buildInterfaces(node.interfaces);
        const fields = this._buildFieldsTree(node.fields);
        const additionalFields = this._getDirectiveArgValue(entityDirective, 'additionalFields');
        this._addAdditionalFields(fields, additionalFields);
        return new DeclarationBlock(this._declarationBlockConfig)
            .export()
            .asKind('type')
            .withName(this.convertName(node, { suffix: this.config.dbTypeSuffix }))
            .withContent(implementingInterfaces.length ? implementingInterfaces.join(' & ') + ' & ' : '')
            .withBlock(fields.string).string;
    }
}
//# sourceMappingURL=visitor.js.map