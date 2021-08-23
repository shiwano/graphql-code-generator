export function generateQueryVariablesSignature(hasRequiredVariables, operationVariablesTypes) {
    return `variables${hasRequiredVariables ? '' : '?'}: ${operationVariablesTypes}`;
}
export function generateQueryKey(node) {
    return `['${node.name.value}', variables]`;
}
export function generateQueryKeyMaker(node, operationName, operationVariablesTypes, hasRequiredVariables) {
    const signature = generateQueryVariablesSignature(hasRequiredVariables, operationVariablesTypes);
    return `\nuse${operationName}.getKey = (${signature}) => ${generateQueryKey(node)};\n`;
}
//# sourceMappingURL=variables-generator.js.map