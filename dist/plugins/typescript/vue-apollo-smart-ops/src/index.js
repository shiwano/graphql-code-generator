import { extname } from 'path';
import { visit, concatAST, Kind } from 'graphql';
import { VueApolloVisitor } from './visitor';
export const plugin = (schema, documents, config) => {
    const allAst = concatAST(documents.map(s => s.document));
    const allFragments = [
        ...allAst.definitions.filter(d => d.kind === Kind.FRAGMENT_DEFINITION).map(fragmentDef => ({
            node: fragmentDef,
            name: fragmentDef.name.value,
            onType: fragmentDef.typeCondition.name.value,
            isExternal: false,
        })),
        ...(config.externalFragments || []),
    ];
    const visitor = new VueApolloVisitor(schema, allFragments, config, documents);
    const visitorResult = visit(allAst, { leave: visitor });
    return {
        prepend: visitor.getImports(),
        content: [
            visitor.fragments,
            ...visitorResult.definitions.filter((definition) => typeof definition === 'string'),
        ].join('\n'),
    };
};
export const validate = (_schema, _documents, _config, outputFile) => {
    if (extname(outputFile) !== '.ts' && extname(outputFile) !== '.tsx') {
        throw new Error(`Plugin "typescript-vue-apollo-smart-ops" requires extension to be ".ts" or ".tsx"!`);
    }
};
export { VueApolloVisitor };
//# sourceMappingURL=index.js.map