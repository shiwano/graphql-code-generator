import { OperationVariablesToObject, normalizeAvoidOptionals, } from '@graphql-codegen/visitor-plugin-common';
import { Kind } from 'graphql';
export class TypeScriptOperationVariablesToObject extends OperationVariablesToObject {
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
        if (typeNode.kind === Kind.NON_NULL_TYPE) {
            const type = this.wrapAstTypeWithModifiers(baseType, typeNode.type, applyCoercion);
            return this.clearOptional(type);
        }
        else if (typeNode.kind === Kind.LIST_TYPE) {
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
        const options = normalizeAvoidOptionals(this._avoidOptionals);
        return ((options.object || !options.defaultValue) && hasDefaultValue) || (!options.object && !isNonNullType);
    }
    getPunctuation() {
        return ';';
    }
}
//# sourceMappingURL=typescript-variables-to-object.js.map