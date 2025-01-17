import { visit, concatAST, Kind } from 'graphql';
import { ReactApolloVisitor } from './visitor';
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
    const visitor = new ReactApolloVisitor(schema, allFragments, config, documents);
    const visitorResult = visit(allAst, { leave: visitor });
    return {
        prepend: visitor.getImports(),
        content: [visitor.fragments, ...visitorResult.definitions.filter(t => typeof t === 'string')].join('\n'),
    };
};
export const validate = async (schema, documents, config, outputFile) => {
    if (config.withComponent === true) {
        if (extname(outputFile) !== '.tsx') {
            throw new Error(`Plugin "typescript-react-apollo" requires extension to be ".tsx" when withComponent: true is set!`);
        }
    }
    else {
        if (extname(outputFile) !== '.ts' && extname(outputFile) !== '.tsx') {
            throw new Error(`Plugin "typescript-react-apollo" requires extension to be ".ts" or ".tsx"!`);
        }
    }
};
export { ReactApolloVisitor };
//# sourceMappingURL=index.js.map