import * as addPlugin from '@graphql-codegen/add';
import * as typedDocumentNodePlugin from '@graphql-codegen/typed-document-node';
import * as typescriptOperationPlugin from '@graphql-codegen/typescript-operations';
import * as typescriptPlugin from '@graphql-codegen/typescript';
import * as gqlTagPlugin from '@graphql-codegen/gql-tag-operations';
import { ClientSideBaseVisitor } from '@graphql-codegen/visitor-plugin-common';

function processSources(sources, buildName) {
    var _a, _b;
    const sourcesWithOperations = [];
    for (const source of sources) {
        const { document } = source;
        const operations = [];
        for (const definition of (_a = document === null || document === void 0 ? void 0 : document.definitions) !== null && _a !== void 0 ? _a : []) {
            if ((definition === null || definition === void 0 ? void 0 : definition.kind) !== `OperationDefinition` && (definition === null || definition === void 0 ? void 0 : definition.kind) !== 'FragmentDefinition')
                continue;
            if (((_b = definition.name) === null || _b === void 0 ? void 0 : _b.kind) !== `Name`)
                continue;
            operations.push({
                initialName: buildName(definition),
                definition,
            });
        }
        if (operations.length === 0)
            continue;
        sourcesWithOperations.push({
            source,
            operations,
        });
    }
    return sourcesWithOperations;
}

const preset = {
    buildGeneratesSection: options => {
        const visitor = new ClientSideBaseVisitor(options.schemaAst, [], options.config, options.config);
        const sourcesWithOperations = processSources(options.documents, node => {
            if (node.kind === 'FragmentDefinition') {
                return visitor.getFragmentVariableName(node);
            }
            return visitor.getOperationVariableName(node);
        });
        const sources = sourcesWithOperations.map(({ source }) => source);
        const pluginMap = {
            ...options.pluginMap,
            [`add`]: addPlugin,
            [`typescript`]: typescriptPlugin,
            [`typescript-operations`]: typescriptOperationPlugin,
            [`typed-document-node`]: typedDocumentNodePlugin,
            [`gen-dts`]: gqlTagPlugin,
        };
        const plugins = [
            { [`add`]: { content: `/* eslint-disable */` } },
            { [`typescript`]: {} },
            { [`typescript-operations`]: {} },
            { [`typed-document-node`]: {} },
            ...options.plugins,
        ];
        const genDtsPlugins = [
            { [`add`]: { content: `/* eslint-disable */` } },
            { [`gen-dts`]: { sourcesWithOperations } },
        ];
        return [
            {
                filename: `${options.baseOutputDir}/graphql.ts`,
                plugins,
                pluginMap,
                schema: options.schema,
                config: options.config,
                documents: sources,
            },
            {
                filename: `${options.baseOutputDir}/index.ts`,
                plugins: genDtsPlugins,
                pluginMap,
                schema: options.schema,
                config: options.config,
                documents: sources,
            },
        ];
    },
};

export { preset };
