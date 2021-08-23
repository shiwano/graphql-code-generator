import { concatAST } from 'graphql';
import { pascalCase } from 'change-case-all';
import { convertFactory, getConfigValue } from '@graphql-codegen/visitor-plugin-common';

function getOperationSuffix(config, node, operationType) {
    const { omitOperationSuffix = false, dedupeOperationSuffix = false } = config || {};
    const operationName = typeof node === 'string' ? node : node.name ? node.name.value : '';
    return omitOperationSuffix
        ? ''
        : dedupeOperationSuffix && operationName.toLowerCase().endsWith(operationType.toLowerCase())
            ? ''
            : operationType;
}
const plugin = (schema, documents, config) => {
    const allAst = concatAST(documents.map(v => v.document));
    const convertName = convertFactory(config);
    const operationResultSuffix = getConfigValue(config.operationResultSuffix, '');
    const out = allAst.definitions
        .map(node => {
        var _a;
        if (node.kind === 'OperationDefinition' && ((_a = node.name) === null || _a === void 0 ? void 0 : _a.value)) {
            const operationType = pascalCase(node.operation);
            const operationTypeSuffix = getOperationSuffix(config, node, operationType);
            const operationVariablesTypes = convertName(node, {
                suffix: operationTypeSuffix + 'Variables',
            });
            const storeTypeName = convertName(node, {
                suffix: operationTypeSuffix + 'Store',
            });
            const operationResultType = convertName(node, {
                suffix: operationTypeSuffix + operationResultSuffix,
            });
            return `export type ${storeTypeName} = OperationStore<${operationResultType}, ${operationVariablesTypes}>;`;
        }
        return null;
    })
        .filter(Boolean);
    return {
        prepend: [`import type { OperationStore } from '@urql/svelte';`],
        content: out.filter(Boolean).join('\n'),
    };
};

export { plugin };
