'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

const graphql = require('graphql');
const path = require('path');
const visitorPluginCommon = require('@graphql-codegen/visitor-plugin-common');
const autoBind = _interopDefault(require('auto-bind'));

class TypeScriptDocumentNodesVisitor extends visitorPluginCommon.ClientSideBaseVisitor {
    constructor(schema, fragments, config, documents) {
        super(schema, fragments, {
            documentMode: visitorPluginCommon.DocumentMode.documentNodeImportFragments,
            documentNodeImport: '@graphql-typed-document-node/core#TypedDocumentNode',
            ...config,
        }, {}, documents);
        this.pluginConfig = config;
        autoBind(this);
        // We need to make sure it's there because in this mode, the base plugin doesn't add the import
        if (this.config.documentMode === visitorPluginCommon.DocumentMode.graphQLTag) {
            const documentNodeImport = this._parseImport(this.config.documentNodeImport || 'graphql#DocumentNode');
            const tagImport = this._generateImport(documentNodeImport, 'DocumentNode', true);
            this._imports.add(tagImport);
        }
    }
    SelectionSet(node, _, parent) {
        if (!this.pluginConfig.addTypenameToSelectionSets) {
            return;
        }
        // Don't add __typename to OperationDefinitions.
        if (parent && parent.kind === 'OperationDefinition') {
            return;
        }
        // No changes if no selections.
        const { selections } = node;
        if (!selections) {
            return;
        }
        // If selections already have a __typename or is introspection do nothing.
        const hasTypename = selections.some(selection => selection.kind === 'Field' &&
            (selection.name.value === '__typename' || selection.name.value.lastIndexOf('__', 0) === 0));
        if (hasTypename) {
            return;
        }
        return {
            ...node,
            selections: [
                ...selections,
                {
                    kind: 'Field',
                    name: {
                        kind: 'Name',
                        value: '__typename',
                    },
                },
            ],
        };
    }
    getDocumentNodeSignature(resultType, variablesTypes, node) {
        if (this.config.documentMode === visitorPluginCommon.DocumentMode.documentNode ||
            this.config.documentMode === visitorPluginCommon.DocumentMode.documentNodeImportFragments ||
            this.config.documentMode === visitorPluginCommon.DocumentMode.graphQLTag) {
            return ` as unknown as DocumentNode<${resultType}, ${variablesTypes}>`;
        }
        return super.getDocumentNodeSignature(resultType, variablesTypes, node);
    }
}

const plugin = (schema, rawDocuments, config) => {
    const documents = config.flattenGeneratedTypes ? visitorPluginCommon.optimizeOperations(schema, rawDocuments) : rawDocuments;
    const allAst = graphql.concatAST(documents.map(v => v.document));
    const allFragments = [
        ...allAst.definitions.filter(d => d.kind === graphql.Kind.FRAGMENT_DEFINITION).map(fragmentDef => ({
            node: fragmentDef,
            name: fragmentDef.name.value,
            onType: fragmentDef.typeCondition.name.value,
            isExternal: false,
        })),
        ...(config.externalFragments || []),
    ];
    const visitor = new TypeScriptDocumentNodesVisitor(schema, allFragments, config, documents);
    const visitorResult = graphql.visit(allAst, { leave: visitor });
    return {
        prepend: allAst.definitions.length === 0 ? [] : visitor.getImports(),
        content: [visitor.fragments, ...visitorResult.definitions.filter(t => typeof t === 'string')].join('\n'),
    };
};
const validate = async (schema, documents, config, outputFile) => {
    if (config && config.documentMode === visitorPluginCommon.DocumentMode.string) {
        throw new Error(`Plugin "typed-document-node" does not allow using 'documentMode: string' configuration!`);
    }
    if (path.extname(outputFile) !== '.ts' && path.extname(outputFile) !== '.tsx') {
        throw new Error(`Plugin "typed-document-node" requires extension to be ".ts" or ".tsx"!`);
    }
};

exports.plugin = plugin;
exports.validate = validate;
