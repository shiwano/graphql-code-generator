import { DetailedError, federationSpec, getCachedDocumentNodeFromSchema, isComplexPluginOutput } from '@graphql-codegen/plugin-helpers';
import { buildASTSchema, Kind, visit, print } from 'graphql';
import { validateGraphQlDocuments, checkValidationErrors } from '@graphql-tools/utils';
import { mergeSchemas } from '@graphql-tools/schema';

async function executePlugin(options, plugin) {
    if (!plugin || !plugin.plugin || typeof plugin.plugin !== 'function') {
        throw new DetailedError(`Invalid Custom Plugin "${options.name}"`, `
        Plugin ${options.name} does not export a valid JS object with "plugin" function.
  
        Make sure your custom plugin is written in the following form:
  
        module.exports = {
          plugin: (schema, documents, config) => {
            return 'my-custom-plugin-content';
          },
        };
        `);
    }
    const outputSchema = options.schemaAst || buildASTSchema(options.schema, options.config);
    const documents = options.documents || [];
    const pluginContext = options.pluginContext || {};
    if (plugin.validate && typeof plugin.validate === 'function') {
        try {
            // FIXME: Sync validate signature with plugin signature
            await plugin.validate(outputSchema, documents, options.config, options.outputFilename, options.allPlugins, pluginContext);
        }
        catch (e) {
            throw new DetailedError(`Plugin "${options.name}" validation failed:`, `
            ${e.message}
          `);
        }
    }
    return Promise.resolve(plugin.plugin(outputSchema, documents, typeof options.config === 'object' ? { ...options.config } : options.config, {
        outputFile: options.outputFilename,
        allPlugins: options.allPlugins,
        pluginContext,
    }));
}

async function codegen(options) {
    const documents = options.documents || [];
    if (documents.length > 0 && !options.skipDocumentsValidation) {
        validateDuplicateDocuments(documents);
    }
    const pluginPackages = Object.keys(options.pluginMap).map(key => options.pluginMap[key]);
    if (!options.schemaAst) {
        options.schemaAst = mergeSchemas({
            schemas: [],
            typeDefs: [options.schema],
            convertExtensions: true,
            assumeValid: true,
            assumeValidSDL: true,
            ...options.config,
        });
    }
    // merged schema with parts added by plugins
    let schemaChanged = false;
    let schemaAst = pluginPackages.reduce((schemaAst, plugin) => {
        const addToSchema = typeof plugin.addToSchema === 'function' ? plugin.addToSchema(options.config) : plugin.addToSchema;
        if (!addToSchema) {
            return schemaAst;
        }
        return mergeSchemas({
            schemas: [schemaAst],
            typeDefs: [addToSchema],
        });
    }, options.schemaAst);
    const federationInConfig = pickFlag('federation', options.config);
    const isFederation = prioritize(federationInConfig, false);
    if (isFederation &&
        !schemaAst.getDirective('external') &&
        !schemaAst.getDirective('requires') &&
        !schemaAst.getDirective('provides') &&
        !schemaAst.getDirective('key')) {
        schemaChanged = true;
        schemaAst = mergeSchemas({
            schemas: [schemaAst],
            typeDefs: [federationSpec],
            convertExtensions: true,
            assumeValid: true,
            assumeValidSDL: true,
        });
    }
    if (schemaChanged) {
        options.schema = getCachedDocumentNodeFromSchema(schemaAst);
    }
    const skipDocumentValidation = typeof options.config === 'object' && !Array.isArray(options.config) && options.config.skipDocumentsValidation;
    if (options.schemaAst && documents.length > 0 && !skipDocumentValidation) {
        const extraFragments = options.config && options.config.externalFragments ? options.config.externalFragments : [];
        const errors = await validateGraphQlDocuments(options.schemaAst, [
            ...documents,
            ...extraFragments.map(f => ({
                location: f.importFrom,
                document: { kind: Kind.DOCUMENT, definitions: [f.node] },
            })),
        ]);
        checkValidationErrors(errors);
    }
    const prepend = new Set();
    const append = new Set();
    const output = await Promise.all(options.plugins.map(async (plugin) => {
        const name = Object.keys(plugin)[0];
        const pluginPackage = options.pluginMap[name];
        const pluginConfig = plugin[name] || {};
        const execConfig = typeof pluginConfig !== 'object'
            ? pluginConfig
            : {
                ...options.config,
                ...pluginConfig,
            };
        const result = await executePlugin({
            name,
            config: execConfig,
            parentConfig: options.config,
            schema: options.schema,
            schemaAst,
            documents: options.documents,
            outputFilename: options.filename,
            allPlugins: options.plugins,
            skipDocumentsValidation: options.skipDocumentsValidation,
            pluginContext: options.pluginContext,
        }, pluginPackage);
        if (typeof result === 'string') {
            return result || '';
        }
        else if (isComplexPluginOutput(result)) {
            if (result.append && result.append.length > 0) {
                for (const item of result.append) {
                    if (item) {
                        append.add(item);
                    }
                }
            }
            if (result.prepend && result.prepend.length > 0) {
                for (const item of result.prepend) {
                    if (item) {
                        prepend.add(item);
                    }
                }
            }
            return result.content || '';
        }
        return '';
    }));
    return [...sortPrependValues(Array.from(prepend.values())), ...output, ...Array.from(append.values())]
        .filter(Boolean)
        .join('\n');
}
function resolveCompareValue(a) {
    if (a.startsWith('/*') || a.startsWith('//') || a.startsWith(' *') || a.startsWith(' */') || a.startsWith('*/')) {
        return 0;
    }
    else if (a.startsWith('package')) {
        return 1;
    }
    else if (a.startsWith('import')) {
        return 2;
    }
    else {
        return 3;
    }
}
function sortPrependValues(values) {
    return values.sort((a, b) => {
        const aV = resolveCompareValue(a);
        const bV = resolveCompareValue(b);
        if (aV < bV) {
            return -1;
        }
        if (aV > bV) {
            return 1;
        }
        return 0;
    });
}
function validateDuplicateDocuments(files) {
    // duplicated names
    const definitionMap = {};
    function addDefinition(file, node, deduplicatedDefinitions) {
        if (typeof node.name !== 'undefined') {
            if (!definitionMap[node.kind]) {
                definitionMap[node.kind] = {};
            }
            if (!definitionMap[node.kind][node.name.value]) {
                definitionMap[node.kind][node.name.value] = {
                    paths: new Set(),
                    contents: new Set(),
                };
            }
            const definitionKindMap = definitionMap[node.kind];
            const length = definitionKindMap[node.name.value].contents.size;
            definitionKindMap[node.name.value].paths.add(file.location);
            definitionKindMap[node.name.value].contents.add(print(node));
            if (length === definitionKindMap[node.name.value].contents.size) {
                return null;
            }
        }
        return deduplicatedDefinitions.add(node);
    }
    files.forEach(file => {
        const deduplicatedDefinitions = new Set();
        visit(file.document, {
            OperationDefinition(node) {
                addDefinition(file, node, deduplicatedDefinitions);
            },
            FragmentDefinition(node) {
                addDefinition(file, node, deduplicatedDefinitions);
            },
        });
        file.document.definitions = Array.from(deduplicatedDefinitions);
    });
    const kinds = Object.keys(definitionMap);
    kinds.forEach(kind => {
        const definitionKindMap = definitionMap[kind];
        const names = Object.keys(definitionKindMap);
        if (names.length) {
            const duplicated = names.filter(name => definitionKindMap[name].contents.size > 1);
            if (!duplicated.length) {
                return;
            }
            const list = duplicated
                .map(name => `
        * ${name} found in:
          ${[...definitionKindMap[name].paths]
                .map(filepath => {
                return `
              - ${filepath}
            `.trimRight();
            })
                .join('')}
    `.trimRight())
                .join('');
            const definitionKindName = kind.replace('Definition', '').toLowerCase();
            throw new DetailedError(`Not all ${definitionKindName}s have an unique name: ${duplicated.join(', ')}`, `
          Not all ${definitionKindName}s have an unique name
          ${list}
        `);
        }
    });
}
function isObjectMap(obj) {
    return obj && typeof obj === 'object' && !Array.isArray(obj);
}
function prioritize(...values) {
    const picked = values.find(val => typeof val === 'boolean');
    if (typeof picked !== 'boolean') {
        return values[values.length - 1];
    }
    return picked;
}
function pickFlag(flag, config) {
    return isObjectMap(config) ? config[flag] : undefined;
}

export { codegen, executePlugin };
