import { lexicographicSortSchema, printSchema, visit, buildASTSchema } from 'graphql';
import { removeFederation, getCachedDocumentNodeFromSchema } from '@graphql-codegen/plugin-helpers';
import { extname } from 'path';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

const plugin = async (schema, _documents, { commentDescriptions = false, includeDirectives = false, sort = false, federation }) => {
    let outputSchema = federation ? removeFederation(schema) : schema;
    outputSchema = sort ? lexicographicSortSchema(outputSchema) : outputSchema;
    if (includeDirectives) {
        return printSchemaWithDirectives(outputSchema);
    }
    return printSchema(outputSchema, { commentDescriptions: commentDescriptions });
};
const validate = async (_schema, _documents, _config, outputFile, allPlugins) => {
    const singlePlugin = allPlugins.length === 1;
    if (singlePlugin && extname(outputFile) !== '.graphql') {
        throw new Error(`Plugin "schema-ast" requires extension to be ".graphql"!`);
    }
};
function transformSchemaAST(schema, config) {
    const astNode = getCachedDocumentNodeFromSchema(schema);
    const transformedAST = config.disableDescriptions
        ? visit(astNode, {
            leave: node => ({
                ...node,
                description: undefined,
            }),
        })
        : astNode;
    const transformedSchema = config.disableDescriptions ? buildASTSchema(transformedAST) : schema;
    return {
        schema: transformedSchema,
        ast: transformedAST,
    };
}

export { plugin, transformSchemaAST, validate };
