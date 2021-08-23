import { visit, concatAST, Kind } from 'graphql';
import { RTKQueryVisitor } from './visitor';
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
    const visitor = new RTKQueryVisitor(schema, allFragments, config, documents);
    const visitorResult = visit(allAst, { leave: visitor });
    return {
        prepend: visitor.getImports(),
        content: [
            visitor.fragments,
            ...visitorResult.definitions.filter(t => typeof t === 'string'),
            visitor.getInjectCall(),
        ].join('\n'),
    };
};
export const validate = async (schema, documents, config, outputFile) => {
    if (extname(outputFile) !== '.ts' && extname(outputFile) !== '.tsx') {
        throw new Error(`Plugin "typescript-rtk-query" requires extension to be ".ts" or ".tsx"!`);
    }
    if (!config.importBaseApiFrom) {
        throw new Error(`You must specify the "importBaseApiFrom" option to use the RTK Query plugin!` + JSON.stringify(config));
    }
};
export { RTKQueryVisitor };
//# sourceMappingURL=index.js.map