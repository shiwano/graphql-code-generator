import { TypeScriptOperationVariablesToObject as TSOperationVariablesToObject } from '@graphql-codegen/typescript';
export class TypeScriptOperationVariablesToObject extends TSOperationVariablesToObject {
    formatTypeString(fieldType, isNonNullType, _hasDefaultValue) {
        return fieldType;
    }
}
//# sourceMappingURL=ts-operation-variables-to-object.js.map