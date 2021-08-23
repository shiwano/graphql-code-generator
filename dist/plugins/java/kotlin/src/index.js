import { visit } from 'graphql';
import { getCachedDocumentNodeFromSchema } from '@graphql-codegen/plugin-helpers';
import { KotlinResolversVisitor } from './visitor';
import { buildPackageNameFromPath } from '@graphql-codegen/java-common';
import { dirname, normalize } from 'path';
export const plugin = async (schema, documents, config, { outputFile }) => {
    const relevantPath = dirname(normalize(outputFile));
    const defaultPackageName = buildPackageNameFromPath(relevantPath);
    const visitor = new KotlinResolversVisitor(config, schema, defaultPackageName);
    const astNode = getCachedDocumentNodeFromSchema(schema);
    const visitorResult = visit(astNode, { leave: visitor });
    const packageName = visitor.getPackageName();
    const blockContent = visitorResult.definitions.filter(d => typeof d === 'string').join('\n\n');
    return [packageName, blockContent].join('\n');
};
//# sourceMappingURL=index.js.map