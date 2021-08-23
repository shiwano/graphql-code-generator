import { Kind, isObjectType, isUnionType, isInterfaceType, SchemaMetaFieldDef, TypeMetaFieldDef, isListType, isNonNullType, isTypeSubTypeOf, } from 'graphql';
import { getPossibleTypes, separateSelectionSet, getFieldNodeNameValue, DeclarationBlock, mergeSelectionSets, hasConditionalDirectives, } from './utils';
import { getBaseType, removeNonNullWrapper } from '@graphql-codegen/plugin-helpers';
import autoBind from 'auto-bind';
function isMetadataFieldName(name) {
    return ['__schema', '__type'].includes(name);
}
const metadataFieldMap = {
    __schema: SchemaMetaFieldDef,
    __type: TypeMetaFieldDef,
};
export class SelectionSetToObject {
    constructor(_processor, _scalars, _schema, _convertName, _getFragmentSuffix, _loadedFragments, _config, _parentSchemaType, _selectionSet) {
        this._processor = _processor;
        this._scalars = _scalars;
        this._schema = _schema;
        this._convertName = _convertName;
        this._getFragmentSuffix = _getFragmentSuffix;
        this._loadedFragments = _loadedFragments;
        this._config = _config;
        this._parentSchemaType = _parentSchemaType;
        this._selectionSet = _selectionSet;
        this._primitiveFields = [];
        this._primitiveAliasedFields = [];
        this._linksFields = [];
        this._queriedForTypename = false;
        autoBind(this);
    }
    createNext(parentSchemaType, selectionSet) {
        return new SelectionSetToObject(this._processor, this._scalars, this._schema, this._convertName.bind(this), this._getFragmentSuffix.bind(this), this._loadedFragments, this._config, parentSchemaType, selectionSet);
    }
    /**
     * traverse the inline fragment nodes recursively for collecting the selectionSets on each type
     */
    _collectInlineFragments(parentType, nodes, types) {
        if (isListType(parentType) || isNonNullType(parentType)) {
            return this._collectInlineFragments(parentType.ofType, nodes, types);
        }
        else if (isObjectType(parentType)) {
            for (const node of nodes) {
                const typeOnSchema = node.typeCondition ? this._schema.getType(node.typeCondition.name.value) : parentType;
                const { fields, inlines, spreads } = separateSelectionSet(node.selectionSet.selections);
                const spreadsUsage = this.buildFragmentSpreadsUsage(spreads);
                if (isObjectType(typeOnSchema)) {
                    this._appendToTypeMap(types, typeOnSchema.name, fields);
                    this._appendToTypeMap(types, typeOnSchema.name, spreadsUsage[typeOnSchema.name]);
                    this._collectInlineFragments(typeOnSchema, inlines, types);
                }
                else if (isInterfaceType(typeOnSchema) && parentType.getInterfaces().includes(typeOnSchema)) {
                    this._appendToTypeMap(types, parentType.name, fields);
                    this._appendToTypeMap(types, parentType.name, spreadsUsage[parentType.name]);
                    this._collectInlineFragments(typeOnSchema, inlines, types);
                }
            }
        }
        else if (isInterfaceType(parentType)) {
            const possibleTypes = getPossibleTypes(this._schema, parentType);
            for (const node of nodes) {
                const schemaType = node.typeCondition ? this._schema.getType(node.typeCondition.name.value) : parentType;
                const { fields, inlines, spreads } = separateSelectionSet(node.selectionSet.selections);
                const spreadsUsage = this.buildFragmentSpreadsUsage(spreads);
                if (isObjectType(schemaType) && possibleTypes.find(possibleType => possibleType.name === schemaType.name)) {
                    this._appendToTypeMap(types, schemaType.name, fields);
                    this._appendToTypeMap(types, schemaType.name, spreadsUsage[schemaType.name]);
                    this._collectInlineFragments(schemaType, inlines, types);
                }
                else if (isInterfaceType(schemaType) && schemaType.name === parentType.name) {
                    for (const possibleType of possibleTypes) {
                        this._appendToTypeMap(types, possibleType.name, fields);
                        this._appendToTypeMap(types, possibleType.name, spreadsUsage[possibleType.name]);
                        this._collectInlineFragments(schemaType, inlines, types);
                    }
                }
                else {
                    // it must be an interface type that is spread on an interface field
                    for (const possibleType of possibleTypes) {
                        if (!node.typeCondition) {
                            throw new Error('Invalid state. Expected type condition for interface spread on a interface field.');
                        }
                        const fragmentSpreadType = this._schema.getType(node.typeCondition.name.value);
                        // the field should only be added to the valid selections
                        // in case the possible type actually implements the given interface
                        if (isTypeSubTypeOf(this._schema, possibleType, fragmentSpreadType)) {
                            this._appendToTypeMap(types, possibleType.name, fields);
                            this._appendToTypeMap(types, possibleType.name, spreadsUsage[possibleType.name]);
                        }
                    }
                }
            }
        }
        else if (isUnionType(parentType)) {
            const possibleTypes = parentType.getTypes();
            for (const node of nodes) {
                const schemaType = node.typeCondition ? this._schema.getType(node.typeCondition.name.value) : parentType;
                const { fields, inlines, spreads } = separateSelectionSet(node.selectionSet.selections);
                const spreadsUsage = this.buildFragmentSpreadsUsage(spreads);
                if (isObjectType(schemaType) && possibleTypes.find(possibleType => possibleType.name === schemaType.name)) {
                    this._appendToTypeMap(types, schemaType.name, fields);
                    this._appendToTypeMap(types, schemaType.name, spreadsUsage[schemaType.name]);
                    this._collectInlineFragments(schemaType, inlines, types);
                }
                else if (isInterfaceType(schemaType)) {
                    const possibleInterfaceTypes = getPossibleTypes(this._schema, schemaType);
                    for (const possibleType of possibleTypes) {
                        if (possibleInterfaceTypes.find(possibleInterfaceType => possibleInterfaceType.name === possibleType.name)) {
                            this._appendToTypeMap(types, possibleType.name, fields);
                            this._appendToTypeMap(types, possibleType.name, spreadsUsage[possibleType.name]);
                            this._collectInlineFragments(schemaType, inlines, types);
                        }
                    }
                }
                else {
                    for (const possibleType of possibleTypes) {
                        this._appendToTypeMap(types, possibleType.name, fields);
                        this._appendToTypeMap(types, possibleType.name, spreadsUsage[possibleType.name]);
                    }
                }
            }
        }
    }
    _createInlineFragmentForFieldNodes(parentType, fieldNodes) {
        return {
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
                kind: Kind.NAMED_TYPE,
                name: {
                    kind: Kind.NAME,
                    value: parentType.name,
                },
            },
            directives: [],
            selectionSet: {
                kind: Kind.SELECTION_SET,
                selections: fieldNodes,
            },
        };
    }
    buildFragmentSpreadsUsage(spreads) {
        const selectionNodesByTypeName = {};
        for (const spread of spreads) {
            const fragmentSpreadObject = this._loadedFragments.find(lf => lf.name === spread.name.value);
            if (fragmentSpreadObject) {
                const schemaType = this._schema.getType(fragmentSpreadObject.onType);
                const possibleTypesForFragment = getPossibleTypes(this._schema, schemaType);
                for (const possibleType of possibleTypesForFragment) {
                    const fragmentSuffix = this._getFragmentSuffix(spread.name.value);
                    const usage = this.buildFragmentTypeName(spread.name.value, fragmentSuffix, possibleTypesForFragment.length === 1 ? null : possibleType.name);
                    if (!selectionNodesByTypeName[possibleType.name]) {
                        selectionNodesByTypeName[possibleType.name] = [];
                    }
                    selectionNodesByTypeName[possibleType.name].push({
                        fragmentName: spread.name.value,
                        typeName: usage,
                        onType: fragmentSpreadObject.onType,
                        selectionNodes: [...fragmentSpreadObject.node.selectionSet.selections],
                    });
                }
            }
        }
        return selectionNodesByTypeName;
    }
    flattenSelectionSet(selections) {
        const selectionNodesByTypeName = new Map();
        const inlineFragmentSelections = [];
        const fieldNodes = [];
        const fragmentSpreads = [];
        for (const selection of selections) {
            switch (selection.kind) {
                case Kind.FIELD:
                    fieldNodes.push(selection);
                    break;
                case Kind.INLINE_FRAGMENT:
                    inlineFragmentSelections.push(selection);
                    break;
                case Kind.FRAGMENT_SPREAD:
                    fragmentSpreads.push(selection);
                    break;
            }
        }
        if (fieldNodes.length) {
            inlineFragmentSelections.push(this._createInlineFragmentForFieldNodes(this._parentSchemaType, fieldNodes));
        }
        this._collectInlineFragments(this._parentSchemaType, inlineFragmentSelections, selectionNodesByTypeName);
        const fragmentsUsage = this.buildFragmentSpreadsUsage(fragmentSpreads);
        for (const [typeName, records] of Object.entries(fragmentsUsage)) {
            this._appendToTypeMap(selectionNodesByTypeName, typeName, records);
        }
        return selectionNodesByTypeName;
    }
    _appendToTypeMap(types, typeName, nodes) {
        if (!types.has(typeName)) {
            types.set(typeName, []);
        }
        if (nodes && nodes.length > 0) {
            types.get(typeName).push(...nodes);
        }
    }
    /**
     * mustAddEmptyObject indicates that not all possible types on a union or interface field are covered.
     */
    _buildGroupedSelections() {
        if (!this._selectionSet || !this._selectionSet.selections || this._selectionSet.selections.length === 0) {
            return { grouped: {}, mustAddEmptyObject: true };
        }
        const selectionNodesByTypeName = this.flattenSelectionSet(this._selectionSet.selections);
        // in case there is not a selection for each type, we need to add a empty type.
        let mustAddEmptyObject = false;
        const grouped = getPossibleTypes(this._schema, this._parentSchemaType).reduce((prev, type) => {
            const typeName = type.name;
            const schemaType = this._schema.getType(typeName);
            if (!isObjectType(schemaType)) {
                throw new TypeError(`Invalid state! Schema type ${typeName} is not a valid GraphQL object!`);
            }
            const selectionNodes = selectionNodesByTypeName.get(typeName) || [];
            if (!prev[typeName]) {
                prev[typeName] = [];
            }
            const transformedSet = this.buildSelectionSetString(schemaType, selectionNodes);
            if (transformedSet) {
                prev[typeName].push(transformedSet);
            }
            else {
                mustAddEmptyObject = true;
            }
            return prev;
        }, {});
        return { grouped, mustAddEmptyObject };
    }
    buildSelectionSetString(parentSchemaType, selectionNodes) {
        var _a, _b;
        const primitiveFields = new Map();
        const primitiveAliasFields = new Map();
        const linkFieldSelectionSets = new Map();
        let requireTypename = false;
        // usages via fragment typescript type
        const fragmentsSpreadUsages = [];
        // ensure we mutate no function params
        selectionNodes = [...selectionNodes];
        for (const selectionNode of selectionNodes) {
            if ('kind' in selectionNode) {
                if (selectionNode.kind === 'Field') {
                    if (!selectionNode.selectionSet) {
                        if (selectionNode.alias) {
                            primitiveAliasFields.set(selectionNode.alias.value, selectionNode);
                        }
                        else if (selectionNode.name.value === '__typename') {
                            requireTypename = true;
                        }
                        else {
                            primitiveFields.set(selectionNode.name.value, selectionNode);
                        }
                    }
                    else {
                        let selectedField = null;
                        const fields = parentSchemaType.getFields();
                        selectedField = fields[selectionNode.name.value];
                        if (isMetadataFieldName(selectionNode.name.value)) {
                            selectedField = metadataFieldMap[selectionNode.name.value];
                        }
                        if (!selectedField) {
                            continue;
                        }
                        const fieldName = getFieldNodeNameValue(selectionNode);
                        let linkFieldNode = linkFieldSelectionSets.get(fieldName);
                        if (!linkFieldNode) {
                            linkFieldNode = {
                                selectedFieldType: selectedField.type,
                                field: selectionNode,
                            };
                        }
                        else {
                            linkFieldNode = {
                                ...linkFieldNode,
                                field: {
                                    ...linkFieldNode.field,
                                    selectionSet: mergeSelectionSets(linkFieldNode.field.selectionSet, selectionNode.selectionSet),
                                },
                            };
                        }
                        linkFieldSelectionSets.set(fieldName, linkFieldNode);
                    }
                }
                else {
                    throw new TypeError('Unexpected type.');
                }
                continue;
            }
            if (this._config.inlineFragmentTypes === 'combine') {
                fragmentsSpreadUsages.push(selectionNode.typeName);
                continue;
            }
            // Handle Fragment Spreads by generating inline types.
            const fragmentType = this._schema.getType(selectionNode.onType);
            if (fragmentType == null) {
                throw new TypeError(`Unexpected error: Type ${selectionNode.onType} does not exist within schema.`);
            }
            if (parentSchemaType.name === selectionNode.onType ||
                parentSchemaType.getInterfaces().find(iinterface => iinterface.name === selectionNode.onType) != null ||
                (isUnionType(fragmentType) &&
                    fragmentType.getTypes().find(objectType => objectType.name === parentSchemaType.name))) {
                // also process fields from fragment that apply for this parentType
                const flatten = this.flattenSelectionSet(selectionNode.selectionNodes);
                const typeNodes = (_a = flatten.get(parentSchemaType.name)) !== null && _a !== void 0 ? _a : [];
                selectionNodes.push(...typeNodes);
                for (const iinterface of parentSchemaType.getInterfaces()) {
                    const typeNodes = (_b = flatten.get(iinterface.name)) !== null && _b !== void 0 ? _b : [];
                    selectionNodes.push(...typeNodes);
                }
            }
        }
        const linkFields = [];
        for (const { field, selectedFieldType } of linkFieldSelectionSets.values()) {
            const realSelectedFieldType = getBaseType(selectedFieldType);
            const selectionSet = this.createNext(realSelectedFieldType, field.selectionSet);
            const isConditional = hasConditionalDirectives(field);
            linkFields.push({
                alias: field.alias ? this._processor.config.formatNamedField(field.alias.value, selectedFieldType) : undefined,
                name: this._processor.config.formatNamedField(field.name.value, selectedFieldType, isConditional),
                type: realSelectedFieldType.name,
                selectionSet: this._processor.config.wrapTypeWithModifiers(selectionSet.transformSelectionSet().split(`\n`).join(`\n  `), isConditional ? removeNonNullWrapper(selectedFieldType) : selectedFieldType),
            });
        }
        const typeInfoField = this.buildTypeNameField(parentSchemaType, this._config.nonOptionalTypename, this._config.addTypename, requireTypename, this._config.skipTypeNameForRoot);
        const transformed = [
            ...(typeInfoField ? this._processor.transformTypenameField(typeInfoField.type, typeInfoField.name) : []),
            ...this._processor.transformPrimitiveFields(parentSchemaType, Array.from(primitiveFields.values()).map(field => ({
                isConditional: hasConditionalDirectives(field),
                fieldName: field.name.value,
            }))),
            ...this._processor.transformAliasesPrimitiveFields(parentSchemaType, Array.from(primitiveAliasFields.values()).map(field => ({
                alias: field.alias.value,
                fieldName: field.name.value,
            }))),
            ...this._processor.transformLinkFields(linkFields),
        ].filter(Boolean);
        const allStrings = transformed.filter(t => typeof t === 'string');
        const allObjectsMerged = transformed
            .filter(t => typeof t !== 'string')
            .map((t) => `${t.name}: ${t.type}`);
        let mergedObjectsAsString = null;
        if (allObjectsMerged.length > 0) {
            mergedObjectsAsString = this._processor.buildFieldsIntoObject(allObjectsMerged);
        }
        const fields = [...allStrings, mergedObjectsAsString, ...fragmentsSpreadUsages].filter(Boolean);
        return this._processor.buildSelectionSetFromStrings(fields);
    }
    isRootType(type) {
        const rootType = [this._schema.getQueryType(), this._schema.getMutationType(), this._schema.getSubscriptionType()]
            .filter(Boolean)
            .map(t => t.name);
        return rootType.includes(type.name);
    }
    buildTypeNameField(type, nonOptionalTypename = this._config.nonOptionalTypename, addTypename = this._config.addTypename, queriedForTypename = this._queriedForTypename, skipTypeNameForRoot = this._config.skipTypeNameForRoot) {
        if (this.isRootType(type) && skipTypeNameForRoot && !queriedForTypename) {
            return null;
        }
        if (nonOptionalTypename || addTypename || queriedForTypename) {
            const optionalTypename = !queriedForTypename && !nonOptionalTypename;
            return {
                name: `${this._processor.config.formatNamedField('__typename')}${optionalTypename ? '?' : ''}`,
                type: `'${type.name}'`,
            };
        }
        return null;
    }
    getUnknownType() {
        return 'never';
    }
    getEmptyObjectType() {
        return `{}`;
    }
    getEmptyObjectTypeString(mustAddEmptyObject) {
        return mustAddEmptyObject ? ' | ' + this.getEmptyObjectType() : ``;
    }
    transformSelectionSet() {
        const { grouped, mustAddEmptyObject } = this._buildGroupedSelections();
        // This might happen in case we have an interface, that is being queries, without any GraphQL
        // "type" that implements it. It will lead to a runtime error, but we aim to try to reflect that in
        // build time as well.
        if (Object.keys(grouped).length === 0) {
            return this.getUnknownType();
        }
        return (Object.keys(grouped)
            .map(typeName => {
            const relevant = grouped[typeName].filter(Boolean);
            if (relevant.length === 0) {
                return null;
            }
            else if (relevant.length === 1) {
                return relevant[0];
            }
            else {
                return `( ${relevant.join(' & ')} )`;
            }
        })
            .filter(Boolean)
            .join(' | ') + this.getEmptyObjectTypeString(mustAddEmptyObject));
    }
    transformFragmentSelectionSetToTypes(fragmentName, fragmentSuffix, declarationBlockConfig) {
        const { grouped } = this._buildGroupedSelections();
        const subTypes = Object.keys(grouped)
            .map(typeName => {
            const possibleFields = grouped[typeName].filter(Boolean);
            const declarationName = this.buildFragmentTypeName(fragmentName, fragmentSuffix, typeName);
            if (possibleFields.length === 0) {
                if (!this._config.addTypename) {
                    return { name: declarationName, content: this.getEmptyObjectType() };
                }
                return null;
            }
            return { name: declarationName, content: possibleFields.join(' & ') };
        })
            .filter(Boolean);
        if (subTypes.length === 1) {
            return new DeclarationBlock(declarationBlockConfig)
                .export()
                .asKind('type')
                .withName(this.buildFragmentTypeName(fragmentName, fragmentSuffix))
                .withContent(subTypes[0].content).string;
        }
        return [
            ...subTypes.map(t => new DeclarationBlock(declarationBlockConfig)
                .export(this._config.exportFragmentSpreadSubTypes)
                .asKind('type')
                .withName(t.name)
                .withContent(t.content).string),
            new DeclarationBlock(declarationBlockConfig)
                .export()
                .asKind('type')
                .withName(this.buildFragmentTypeName(fragmentName, fragmentSuffix))
                .withContent(subTypes.map(t => t.name).join(' | ')).string,
        ].join('\n');
    }
    buildFragmentTypeName(name, suffix, typeName = '') {
        return this._convertName(name, {
            useTypesPrefix: true,
            suffix: typeName ? `_${typeName}_${suffix}` : suffix,
        });
    }
}
//# sourceMappingURL=selection-set-to-object.js.map