import { introspectionFromSchema } from 'graphql';
import { removeFederation } from '@graphql-codegen/plugin-helpers';
import { extname } from 'path';
import { getConfigValue } from '../../visitor-plugin-common/src/utils';
export const plugin = async (schema, _documents, pluginConfig) => {
    const cleanSchema = pluginConfig.federation ? removeFederation(schema) : schema;
    const descriptions = getConfigValue(pluginConfig.descriptions, true);
    const directiveIsRepeatable = getConfigValue(pluginConfig.directiveIsRepeatable, true);
    const schemaDescription = getConfigValue(pluginConfig.schemaDescription, undefined);
    const specifiedByUrl = getConfigValue(pluginConfig.specifiedByUrl, undefined);
    const introspection = introspectionFromSchema(cleanSchema, {
        descriptions,
        directiveIsRepeatable,
        schemaDescription,
        specifiedByUrl,
    });
    return pluginConfig.minify ? JSON.stringify(introspection) : JSON.stringify(introspection, null, 2);
};
export const validate = async (schema, documents, config, outputFile) => {
    if (extname(outputFile) !== '.json') {
        throw new Error(`Plugin "introspection" requires extension to be ".json"!`);
    }
};
//# sourceMappingURL=index.js.map