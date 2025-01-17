'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const graphql = require('graphql');
const pluginHelpers = require('@graphql-codegen/plugin-helpers');
const path = require('path');
const utils = require('@graphql-tools/utils');

const plugin = async (schema, _documents, { commentDescriptions = false, includeDirectives = false, sort = false, federation }) => {
    let outputSchema = federation ? pluginHelpers.removeFederation(schema) : schema;
    outputSchema = sort ? graphql.lexicographicSortSchema(outputSchema) : outputSchema;
    if (includeDirectives) {
        return utils.printSchemaWithDirectives(outputSchema);
    }
    return graphql.printSchema(outputSchema, { commentDescriptions: commentDescriptions });
};
const validate = async (_schema, _documents, _config, outputFile, allPlugins) => {
    const singlePlugin = allPlugins.length === 1;
    if (singlePlugin && path.extname(outputFile) !== '.graphql') {
        throw new Error(`Plugin "schema-ast" requires extension to be ".graphql"!`);
    }
};
function transformSchemaAST(schema, config) {
    const astNode = pluginHelpers.getCachedDocumentNodeFromSchema(schema);
    const transformedAST = config.disableDescriptions
        ? graphql.visit(astNode, {
            leave: node => ({
                ...node,
                description: undefined,
            }),
        })
        : astNode;
    const transformedSchema = config.disableDescriptions ? graphql.buildASTSchema(transformedAST) : schema;
    return {
        schema: transformedSchema,
        ast: transformedAST,
    };
}

exports.plugin = plugin;
exports.transformSchemaAST = transformSchemaAST;
exports.validate = validate;
