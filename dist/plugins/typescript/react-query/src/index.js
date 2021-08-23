import { visit, concatAST, Kind } from 'graphql';
import { ReactQueryVisitor } from './visitor';
import { extname } from 'path';
export const plugin = (schema, documents, config) => {
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
    const visitor = new ReactQueryVisitor(schema, allFragments, config, documents);
    const visitorResult = visit(allAst, { leave: visitor });
    if (visitor.hasOperations) {
        return {
            prepend: [...visitor.getImports(), visitor.getFetcherImplementation()],
            content: [visitor.fragments, ...visitorResult.definitions.filter(t => typeof t === 'string')].join('\n'),
        };
    }
    return {
        prepend: [...visitor.getImports()],
        content: [visitor.fragments, ...visitorResult.definitions.filter(t => typeof t === 'string')].join('\n'),
    };
};
export const validate = async (schema, documents, config, outputFile) => {
    if (extname(outputFile) !== '.ts' && extname(outputFile) !== '.tsx') {
        throw new Error(`Plugin "typescript-react-query" requires extension to be ".ts" or ".tsx"!`);
    }
};
export { ReactQueryVisitor };
//# sourceMappingURL=index.js.map