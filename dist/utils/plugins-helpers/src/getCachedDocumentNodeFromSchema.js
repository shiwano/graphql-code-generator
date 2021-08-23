import { getDocumentNodeFromSchema } from '@graphql-tools/utils';
const schemaDocumentNodeCache = new WeakMap();
export function getCachedDocumentNodeFromSchema(schema) {
    let documentNode = schemaDocumentNodeCache.get(schema);
    if (!documentNode) {
        documentNode = getDocumentNodeFromSchema(schema);
        schemaDocumentNodeCache.set(schema, documentNode);
    }
    return documentNode;
}
//# sourceMappingURL=getCachedDocumentNodeFromSchema.js.map