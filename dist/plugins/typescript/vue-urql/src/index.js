import { visit, concatAST, Kind } from 'graphql';
import { UrqlVisitor } from './visitor';
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
    const visitor = new UrqlVisitor(schema, allFragments, config);
    const visitorResult = visit(allAst, { leave: visitor });
    return {
        prepend: visitor.getImports(),
        content: [visitor.fragments, ...visitorResult.definitions.filter(t => typeof t === 'string')].join('\n'),
    };
};
export const validate = async (schema, documents, config, outputFile) => {
    if (extname(outputFile) !== '.ts') {
        throw new Error(`Plugin "typescript-vue-urql" requires extension to be ".ts"!`);
    }
};
export { UrqlVisitor };
//# sourceMappingURL=index.js.map