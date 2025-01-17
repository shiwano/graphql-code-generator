'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const path = require('path');
const pluginHelpers = require('@graphql-codegen/plugin-helpers');
const graphql = require('graphql');

const extensions = {
    ts: ['.ts', '.tsx'],
    js: ['.js', '.jsx'],
    json: ['.json'],
};
const plugin = async (schema, _documents, pluginConfig, info) => {
    const config = {
        module: 'es2015',
        federation: false,
        apolloClientVersion: 3,
        useExplicitTyping: false,
        ...pluginConfig,
    };
    const apolloClientVersion = parseInt(config.apolloClientVersion);
    const cleanSchema = config.federation ? pluginHelpers.removeFederation(schema) : schema;
    const useExplicitTyping = config.useExplicitTyping;
    const introspection = await graphql.execute({
        schema: cleanSchema,
        document: graphql.parse(`
      {
        __schema {
          types {
            kind
            name
            possibleTypes {
              name
            }
          }
        }
      }
    `),
    });
    const ext = path.extname(info.outputFile).toLowerCase();
    if (!introspection.data) {
        throw new Error(`Plugin "fragment-matcher" couldn't introspect the schema`);
    }
    const filterUnionAndInterfaceTypes = type => type.kind === 'UNION' || type.kind === 'INTERFACE';
    const createPossibleTypesCollection = (acc, type) => {
        return { ...acc, ...{ [type.name]: type.possibleTypes.map(possibleType => possibleType.name) } };
    };
    const filteredData = apolloClientVersion === 2
        ? {
            __schema: {
                ...introspection.data.__schema,
                types: introspection.data.__schema.types.filter(type => type.kind === 'UNION' || type.kind === 'INTERFACE'),
            },
        }
        : {
            possibleTypes: introspection.data.__schema.types
                .filter(filterUnionAndInterfaceTypes)
                .reduce(createPossibleTypesCollection, {}),
        };
    const content = JSON.stringify(filteredData, null, 2);
    if (extensions.json.includes(ext)) {
        return content;
    }
    if (extensions.js.includes(ext)) {
        const defaultExportStatement = config.module === 'es2015' ? `export default` : 'module.exports =';
        return `
      ${defaultExportStatement} ${content}
    `;
    }
    if (extensions.ts.includes(ext)) {
        let typename;
        if (apolloClientVersion === 2) {
            typename = `IntrospectionResultData`;
        }
        else if (apolloClientVersion === 3) {
            typename = `PossibleTypesResultData`;
        }
        let type;
        if (useExplicitTyping) {
            type = `export type ${typename} = ${content};`;
        }
        else if (apolloClientVersion === 2) {
            type = `export interface ${typename} {
        __schema: {
          types: {
            kind: string;
            name: string;
            possibleTypes: {
              name: string;
            }[];
          }[];
        };
      }`;
        }
        else if (apolloClientVersion === 3) {
            type = `export interface ${typename} {
        possibleTypes: {
          [key: string]: string[]
        }
      }`;
        }
        return `
      ${type}
      const result: ${typename} = ${content};
      export default result;
    `;
    }
    throw new Error(`Extension ${ext} is not supported`);
};
const validate = async (_schema, _documents, config, outputFile) => {
    const ext = path.extname(outputFile).toLowerCase();
    const all = Object.values(extensions).reduce((acc, exts) => [...acc, ...exts], []);
    if (!all.includes(ext)) {
        throw new Error(`Plugin "fragment-matcher" requires extension to be one of ${all.map(val => val.replace('.', '')).join(', ')}!`);
    }
    if (config.module === 'commonjs' && extensions.ts.includes(ext)) {
        throw new Error(`Plugin "fragment-matcher" doesn't support commonjs modules combined with TypeScript!`);
    }
};

exports.plugin = plugin;
exports.validate = validate;
