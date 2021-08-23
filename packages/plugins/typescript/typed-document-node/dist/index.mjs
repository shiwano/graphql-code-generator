import { concatAST, Kind, visit } from 'graphql';
import { extname } from 'path';
import { ClientSideBaseVisitor, DocumentMode, optimizeOperations } from '@graphql-codegen/visitor-plugin-common';
import autoBind from 'auto-bind';

class TypeScriptDocumentNodesVisitor extends ClientSideBaseVisitor {
    constructor(schema, fragments, config, documents) {
        super(schema, fragments, {
            documentMode: DocumentMode.documentNodeImportFragments,
            documentNodeImport: '@graphql-typed-document-node/core#TypedDocumentNode',
            ...config,
        }, {}, documents);
        this.pluginConfig = config;
        autoBind(this);
        // We need to make sure it's there because in this mode, the base plugin doesn't add the import
        if (this.config.documentMode === DocumentMode.graphQLTag) {
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
        if (this.config.documentMode === DocumentMode.documentNode ||
            this.config.documentMode === DocumentMode.documentNodeImportFragments ||
            this.config.documentMode === DocumentMode.graphQLTag) {
            return ` as unknown as DocumentNode<${resultType}, ${variablesTypes}>`;
        }
        return super.getDocumentNodeSignature(resultType, variablesTypes, node);
    }
}

const plugin = (schema, rawDocuments, config) => {
    const documents = config.flattenGeneratedTypes ? optimizeOperations(schema, rawDocuments) : rawDocuments;
    const allAst = concatAST(documents.map(v => v.document));
    const allFragments = [
        ...allAst.definitions.filter(d => d.kind === Kind.FRAGMENT_DEFINITION).map(fragmentDef => ({
            node: fragmentDef,
            name: fragmentDef.name.value,
            onType: fragmentDef.typeCondition.name.value,
            isExternal: false,
        })),
        ...(config.externalFragments || []),
    ];
    const visitor = new TypeScriptDocumentNodesVisitor(schema, allFragments, config, documents);
    const visitorResult = visit(allAst, { leave: visitor });
    return {
        prepend: allAst.definitions.length === 0 ? [] : visitor.getImports(),
        content: [visitor.fragments, ...visitorResult.definitions.filter(t => typeof t === 'string')].join('\n'),
    };
};
const validate = async (schema, documents, config, outputFile) => {
    if (config && config.documentMode === DocumentMode.string) {
        throw new Error(`Plugin "typed-document-node" does not allow using 'documentMode: string' configuration!`);
    }
    if (extname(outputFile) !== '.ts' && extname(outputFile) !== '.tsx') {
        throw new Error(`Plugin "typed-document-node" requires extension to be ".ts" or ".tsx"!`);
    }
};

export { plugin, validate };
