import { Kind } from 'graphql';
import minIndent from 'min-indent';
import unixify from 'unixify';
export function buildPackageNameFromPath(path) {
    return unixify(path || '')
        .replace(/src\/main\/.*?\//, '')
        .replace(/\//g, '.');
}
export function wrapTypeWithModifiers(baseType, typeNode, listType = 'Iterable') {
    if (typeNode.kind === Kind.NON_NULL_TYPE) {
        return wrapTypeWithModifiers(baseType, typeNode.type, listType);
    }
    else if (typeNode.kind === Kind.LIST_TYPE) {
        const innerType = wrapTypeWithModifiers(baseType, typeNode.type, listType);
        return `${listType}<${innerType}>`;
    }
    else {
        return baseType;
    }
}
export function stripIndent(string) {
    const indent = minIndent(string);
    if (indent === 0) {
        return string;
    }
    const regex = new RegExp(`^[ \\t]{${indent}}`, 'gm');
    return string.replace(regex, '');
}
//# sourceMappingURL=utils.js.map