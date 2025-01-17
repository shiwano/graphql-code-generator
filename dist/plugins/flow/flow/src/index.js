import { getCachedDocumentNodeFromSchema } from '@graphql-codegen/plugin-helpers';
import { visit } from 'graphql';
import { FlowVisitor } from './visitor';
export * from './visitor';
export * from './flow-variables-to-object';
export const plugin = (schema, documents, config) => {
    const header = `// @flow\n`;
    const astNode = getCachedDocumentNodeFromSchema(schema);
    const visitor = new FlowVisitor(schema, config);
    const visitorResult = visit(astNode, {
        leave: visitor,
    });
    return {
        prepend: [header, ...visitor.getEnumsImports()],
        content: [visitor.scalarsDefinition, ...visitorResult.definitions].join('\n'),
    };
};
//# sourceMappingURL=index.js.map