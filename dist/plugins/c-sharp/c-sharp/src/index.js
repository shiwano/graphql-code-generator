import { visit } from 'graphql';
import { getCachedDocumentNodeFromSchema } from '@graphql-codegen/plugin-helpers';
import { CSharpResolversVisitor } from './visitor';
export const plugin = async (schema, documents, config) => {
    const visitor = new CSharpResolversVisitor(config, schema);
    const astNode = getCachedDocumentNodeFromSchema(schema);
    const visitorResult = visit(astNode, { leave: visitor });
    const imports = visitor.getImports();
    const blockContent = visitorResult.definitions.filter(d => typeof d === 'string').join('\n');
    const wrappedBlockContent = visitor.wrapWithClass(blockContent);
    const wrappedContent = visitor.wrapWithNamespace(wrappedBlockContent);
    return [imports, wrappedContent].join('\n');
};
//# sourceMappingURL=index.js.map