import { FlowWithPickSelectionSetProcessor } from './flow-selection-set-processor';
import { isEnumType, isNonNullType, } from 'graphql';
import { FlowOperationVariablesToObject } from '@graphql-codegen/flow';
import { wrapTypeWithModifiers, PreResolveTypesProcessor, BaseDocumentsVisitor, SelectionSetToObject, getConfigValue, generateFragmentImportStatement, } from '@graphql-codegen/visitor-plugin-common';
class FlowSelectionSetToObject extends SelectionSetToObject {
    getUnknownType() {
        return 'any';
    }
    createNext(parentSchemaType, selectionSet) {
        return new FlowSelectionSetToObject(this._processor, this._scalars, this._schema, this._convertName.bind(this), this._getFragmentSuffix.bind(this), this._loadedFragments, this._config, parentSchemaType, selectionSet);
    }
}
import autoBind from 'auto-bind';
export class FlowDocumentsVisitor extends BaseDocumentsVisitor {
    constructor(schema, config, allFragments) {
        super(config, {
            useFlowExactObjects: getConfigValue(config.useFlowExactObjects, true),
            useFlowReadOnlyTypes: getConfigValue(config.useFlowReadOnlyTypes, false),
        }, schema);
        autoBind(this);
        const wrapArray = (type) => `${this.config.useFlowReadOnlyTypes ? '$ReadOnlyArray' : 'Array'}<${type}>`;
        const wrapOptional = (type) => `?${type}`;
        const useFlowReadOnlyTypes = this.config.useFlowReadOnlyTypes;
        const formatNamedField = (name, type, isConditional = false) => {
            const optional = (!!type && !isNonNullType(type)) || isConditional;
            return `${useFlowReadOnlyTypes ? '+' : ''}${name}${optional ? '?' : ''}`;
        };
        const processorConfig = {
            namespacedImportName: this.config.namespacedImportName,
            convertName: this.convertName.bind(this),
            enumPrefix: this.config.enumPrefix,
            scalars: this.scalars,
            formatNamedField,
            wrapTypeWithModifiers(baseType, type) {
                return wrapTypeWithModifiers(baseType, type, { wrapOptional, wrapArray });
            },
        };
        const processor = config.preResolveTypes
            ? new PreResolveTypesProcessor(processorConfig)
            : new FlowWithPickSelectionSetProcessor({
                ...processorConfig,
                useFlowExactObjects: this.config.useFlowExactObjects,
            });
        const enumsNames = Object.keys(schema.getTypeMap()).filter(typeName => isEnumType(schema.getType(typeName)));
        this.setSelectionSetHandler(new FlowSelectionSetToObject(processor, this.scalars, this.schema, this.convertName.bind(this), this.getFragmentSuffix.bind(this), allFragments, this.config));
        this.setVariablesTransformer(new FlowOperationVariablesToObject(this.scalars, this.convertName.bind(this), this.config.namespacedImportName, enumsNames, this.config.enumPrefix, {}, true));
    }
    getPunctuation(declarationKind) {
        return declarationKind === 'type' ? ',' : ';';
    }
    getImports() {
        return !this.config.globalNamespace && !this.config.inlineFragmentTypes
            ? this.config.fragmentImports
                // In flow, all non ` * as x` imports must be type imports
                .map(fragmentImport => ({ ...fragmentImport, typesImport: true }))
                .map(fragmentImport => generateFragmentImportStatement(fragmentImport, 'type'))
            : [];
    }
}
//# sourceMappingURL=visitor.js.map