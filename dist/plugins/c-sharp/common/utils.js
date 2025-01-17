import { Kind } from 'graphql';
import { indent } from '@graphql-codegen/visitor-plugin-common';
import { csharpValueTypes } from './scalars';
export function transformComment(comment, indentLevel = 0) {
    if (!comment) {
        return '';
    }
    if (isStringValueNode(comment)) {
        comment = comment.value;
    }
    comment = comment.trimStart().split('*/').join('*\\/');
    let lines = comment.split('\n');
    lines = ['/// <summary>', ...lines.map(line => `/// ${line}`), '/// </summary>'];
    return lines
        .map(line => indent(line, indentLevel))
        .concat('')
        .join('\n');
}
function isStringValueNode(node) {
    return node && typeof node === 'object' && node.kind === Kind.STRING;
}
export function isValueType(type) {
    // Limitation: only checks the list of known built in value types
    // Eg .NET types and struct types won't be detected correctly
    return csharpValueTypes.includes(type);
}
export function getListTypeField(typeNode) {
    if (typeNode.kind === Kind.LIST_TYPE) {
        return {
            required: false,
            type: getListTypeField(typeNode.type),
        };
    }
    else if (typeNode.kind === Kind.NON_NULL_TYPE && typeNode.type.kind === Kind.LIST_TYPE) {
        return Object.assign(getListTypeField(typeNode.type), {
            required: true,
        });
    }
    else if (typeNode.kind === Kind.NON_NULL_TYPE) {
        return getListTypeField(typeNode.type);
    }
    else {
        return undefined;
    }
}
export function getListTypeDepth(listType) {
    if (listType) {
        return getListTypeDepth(listType.type) + 1;
    }
    else {
        return 0;
    }
}
export function getListInnerTypeNode(typeNode) {
    if (typeNode.kind === Kind.LIST_TYPE) {
        return getListInnerTypeNode(typeNode.type);
    }
    else if (typeNode.kind === Kind.NON_NULL_TYPE && typeNode.type.kind === Kind.LIST_TYPE) {
        return getListInnerTypeNode(typeNode.type);
    }
    else {
        return typeNode;
    }
}
export function wrapFieldType(fieldType, listTypeField, listType = 'IEnumerable') {
    if (listTypeField) {
        const innerType = wrapFieldType(fieldType, listTypeField.type, listType);
        return `${listType}<${innerType}>`;
    }
    else {
        return fieldType.innerTypeName;
    }
}
//# sourceMappingURL=utils.js.map