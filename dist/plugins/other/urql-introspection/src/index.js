import { extname } from 'path';
import { getIntrospectedSchema, minifyIntrospectionQuery } from '@urql/introspection';
const extensions = {
    ts: ['.ts', '.tsx'],
    js: ['.js', '.jsx'],
    json: ['.json'],
};
export const plugin = async (schema, _documents, pluginConfig, info) => {
    const config = {
        module: 'es2015',
        useTypeImports: false,
        ...pluginConfig,
    };
    const ext = extname(info.outputFile).toLowerCase();
    const minifiedData = minifyIntrospectionQuery(getIntrospectedSchema(schema), {
        includeDirectives: config.includeDirectives,
        includeEnums: config.includeEnums,
        includeInputs: config.includeInputs,
        includeScalars: config.includeScalars,
    });
    const content = JSON.stringify(minifiedData, null, 2);
    if (extensions.json.includes(ext)) {
        return content;
    }
    if (extensions.js.includes(ext)) {
        const defaultExportStatement = config.module === 'es2015' ? `export default` : 'module.exports =';
        return `${defaultExportStatement} ${content}`;
    }
    if (extensions.ts.includes(ext)) {
        const typeImport = config.useTypeImports ? 'import type' : 'import';
        return `${typeImport} { IntrospectionQuery } from 'graphql';
export default ${content} as unknown as IntrospectionQuery;`;
    }
    throw new Error(`Extension ${ext} is not supported`);
};
export const validate = async (_schema, _documents, config, outputFile) => {
    const ext = extname(outputFile).toLowerCase();
    const all = Object.values(extensions).reduce((acc, exts) => [...acc, ...exts], []);
    if (!all.includes(ext)) {
        throw new Error(`Plugin "urql-introspection" requires extension to be one of ${all.map(val => val.replace('.', '')).join(', ')}!`);
    }
    if (config.module === 'commonjs' && extensions.ts.includes(ext)) {
        throw new Error(`Plugin "urql-introspection" doesn't support commonjs modules combined with TypeScript!`);
    }
    if (config.useTypeImports && !extensions.ts.includes(ext)) {
        throw new Error(`Plugin "urql-introspection" doesn't support useTypeImports modules not combined with TypeScript!`);
    }
};
//# sourceMappingURL=index.js.map