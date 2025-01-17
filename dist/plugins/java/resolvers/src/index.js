import { visit } from 'graphql';
import { getCachedDocumentNodeFromSchema } from '@graphql-codegen/plugin-helpers';
import { JavaResolversVisitor } from './visitor';
import { buildPackageNameFromPath } from '@graphql-codegen/java-common';
import { dirname, normalize } from 'path';
export const plugin = async (schema, documents, config, { outputFile }) => {
    const relevantPath = dirname(normalize(outputFile));
    const defaultPackageName = buildPackageNameFromPath(relevantPath);
    const visitor = new JavaResolversVisitor(config, schema, defaultPackageName);
    const astNode = getCachedDocumentNodeFromSchema(schema);
    const visitorResult = visit(astNode, { leave: visitor });
    const mappersImports = visitor.getImports();
    const packageName = visitor.getPackageName();
    const blockContent = visitorResult.definitions.filter(d => typeof d === 'string').join('\n');
    const wrappedContent = visitor.wrapWithClass(blockContent);
    return [packageName, mappersImports, wrappedContent].join('\n');
};
//# sourceMappingURL=index.js.map