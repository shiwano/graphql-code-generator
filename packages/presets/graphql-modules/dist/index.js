'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

const graphql = require('graphql');
const path = require('path');
const parse = _interopDefault(require('parse-filepath'));
const changeCaseAll = require('change-case-all');
const visitorPluginCommon = require('@graphql-codegen/visitor-plugin-common');

const sep = '/';
/**
 * Searches every node to collect used types
 */
function collectUsedTypes(doc) {
    const used = [];
    doc.definitions.forEach(findRelated);
    function markAsUsed(type) {
        pushUnique(used, type);
    }
    function findRelated(node) {
        if (node.kind === graphql.Kind.OBJECT_TYPE_DEFINITION || node.kind === graphql.Kind.OBJECT_TYPE_EXTENSION) {
            // Object
            markAsUsed(node.name.value);
            if (node.fields) {
                node.fields.forEach(findRelated);
            }
            if (node.interfaces) {
                node.interfaces.forEach(findRelated);
            }
        }
        else if (node.kind === graphql.Kind.INPUT_OBJECT_TYPE_DEFINITION || node.kind === graphql.Kind.INPUT_OBJECT_TYPE_EXTENSION) {
            // Input
            markAsUsed(node.name.value);
            if (node.fields) {
                node.fields.forEach(findRelated);
            }
        }
        else if (node.kind === graphql.Kind.INTERFACE_TYPE_DEFINITION || node.kind === graphql.Kind.INTERFACE_TYPE_EXTENSION) {
            // Interface
            markAsUsed(node.name.value);
            if (node.fields) {
                node.fields.forEach(findRelated);
            }
            if (node.interfaces) {
                node.interfaces.forEach(findRelated);
            }
        }
        else if (node.kind === graphql.Kind.UNION_TYPE_DEFINITION || node.kind === graphql.Kind.UNION_TYPE_EXTENSION) {
            // Union
            markAsUsed(node.name.value);
            if (node.types) {
                node.types.forEach(findRelated);
            }
        }
        else if (node.kind === graphql.Kind.ENUM_TYPE_DEFINITION || node.kind === graphql.Kind.ENUM_TYPE_EXTENSION) {
            // Enum
            markAsUsed(node.name.value);
        }
        else if (node.kind === graphql.Kind.SCALAR_TYPE_DEFINITION || node.kind === graphql.Kind.SCALAR_TYPE_EXTENSION) {
            // Scalar
            if (!isGraphQLPrimitive(node.name.value)) {
                markAsUsed(node.name.value);
            }
        }
        else if (node.kind === graphql.Kind.INPUT_VALUE_DEFINITION) {
            // Argument
            findRelated(resolveTypeNode(node.type));
        }
        else if (node.kind === graphql.Kind.FIELD_DEFINITION) {
            // Field
            findRelated(resolveTypeNode(node.type));
            if (node.arguments) {
                node.arguments.forEach(findRelated);
            }
        }
        else if (node.kind === graphql.Kind.NAMED_TYPE) {
            // Named type
            if (!isGraphQLPrimitive(node.name.value)) {
                markAsUsed(node.name.value);
            }
        }
    }
    return used;
}
function resolveTypeNode(node) {
    if (node.kind === graphql.Kind.LIST_TYPE) {
        return resolveTypeNode(node.type);
    }
    if (node.kind === graphql.Kind.NON_NULL_TYPE) {
        return resolveTypeNode(node.type);
    }
    return node;
}
function isGraphQLPrimitive(name) {
    return ['String', 'Boolean', 'ID', 'Float', 'Int'].includes(name);
}
function unique(val, i, all) {
    return i === all.indexOf(val);
}
function withQuotes(val) {
    return `'${val}'`;
}
function indent(size) {
    const space = new Array(size).fill(' ').join('');
    function indentInner(val) {
        return val
            .split('\n')
            .map(line => `${space}${line}`)
            .join('\n');
    }
    return indentInner;
}
function buildBlock({ name, lines }) {
    if (!lines.length) {
        return '';
    }
    return [`${name} {`, ...lines.map(indent(2)), '};'].join('\n');
}
const getRelativePath = function (filepath, basePath) {
    const normalizedFilepath = normalize(filepath);
    const normalizedBasePath = ensureStartsWithSeparator(normalize(ensureEndsWithSeparator(basePath)));
    const [, relativePath] = normalizedFilepath.split(normalizedBasePath);
    return relativePath;
};
function groupSourcesByModule(sources, basePath) {
    const grouped = {};
    sources.forEach(source => {
        const relativePath = getRelativePath(source.location, basePath);
        if (relativePath) {
            // PERF: we could guess the module by matching source.location with a list of already resolved paths
            const mod = extractModuleDirectory(source.location, basePath);
            if (!grouped[mod]) {
                grouped[mod] = [];
            }
            grouped[mod].push(source);
        }
    });
    return grouped;
}
function extractModuleDirectory(filepath, basePath) {
    const relativePath = getRelativePath(filepath, basePath);
    const [moduleDirectory] = relativePath.split(sep);
    return moduleDirectory;
}
function stripFilename(path) {
    const parsedPath = parse(path);
    return normalize(parsedPath.dir);
}
function normalize(path) {
    return path.replace(/\\/g, '/');
}
function ensureEndsWithSeparator(path) {
    return path.endsWith(sep) ? path : path + sep;
}
function ensureStartsWithSeparator(path) {
    return path.startsWith('.') ? path.replace(/^(..\/)|(.\/)/, '/') : path.startsWith('/') ? path : '/' + path;
}
/**
 * Pushes an item to a list only if the list doesn't include the item
 */
function pushUnique(list, item) {
    if (!list.includes(item)) {
        list.push(item);
    }
}
function concatByKey(left, right, key) {
    return left[key].concat(right[key]);
}
function uniqueByKey(left, right, key) {
    return left[key].filter(item => !right[key].includes(item));
}
function createObject(keys, valueFn) {
    const obj = {};
    keys.forEach(key => {
        obj[key] = valueFn(key);
    });
    return obj;
}

const registryKeys = ['objects', 'inputs', 'interfaces', 'scalars', 'unions', 'enums'];
const resolverKeys = ['scalars', 'objects', 'enums'];
function buildModule(name, doc, { importNamespace, importPath, encapsulate, shouldDeclare, rootTypes, schema, baseVisitor, }) {
    const picks = createObject(registryKeys, () => ({}));
    const defined = createObject(registryKeys, () => []);
    const extended = createObject(registryKeys, () => []);
    // List of types used in objects, fields, arguments etc
    const usedTypes = collectUsedTypes(doc);
    graphql.visit(doc, {
        ObjectTypeDefinition(node) {
            collectTypeDefinition(node);
        },
        ObjectTypeExtension(node) {
            collectTypeExtension(node);
        },
        InputObjectTypeDefinition(node) {
            collectTypeDefinition(node);
        },
        InputObjectTypeExtension(node) {
            collectTypeExtension(node);
        },
        InterfaceTypeDefinition(node) {
            collectTypeDefinition(node);
        },
        InterfaceTypeExtension(node) {
            collectTypeExtension(node);
        },
        ScalarTypeDefinition(node) {
            collectTypeDefinition(node);
        },
        UnionTypeDefinition(node) {
            collectTypeDefinition(node);
        },
        UnionTypeExtension(node) {
            collectTypeExtension(node);
        },
        EnumTypeDefinition(node) {
            collectTypeDefinition(node);
        },
        EnumTypeExtension(node) {
            collectTypeExtension(node);
        },
    });
    // Defined and Extended types
    const visited = createObject(registryKeys, key => concatByKey(defined, extended, key));
    // Types that are not defined or extended in a module, they come from other modules
    const external = createObject(registryKeys, key => uniqueByKey(extended, defined, key));
    //
    //
    //
    // Prints
    //
    //
    //
    // An actual output
    const imports = [`import * as ${importNamespace} from "${importPath}";`, `import * as gm from "graphql-modules";`];
    let content = [
        printDefinedFields(),
        printDefinedEnumValues(),
        printDefinedInputFields(),
        printSchemaTypes(usedTypes),
        printScalars(visited),
        printResolveSignaturesPerType(visited),
        printResolversType(visited),
        printResolveMiddlewareMap(),
    ]
        .filter(Boolean)
        .join('\n\n');
    if (encapsulate === 'namespace') {
        content =
            `${shouldDeclare ? 'declare' : 'export'} namespace ${baseVisitor.convertName(name, {
                suffix: 'Module',
                useTypesPrefix: false,
                useTypesSuffix: false,
            })} {\n` +
                (shouldDeclare ? `${indent(2)(imports.join('\n'))}\n` : '') +
                indent(2)(content) +
                '\n}';
    }
    return [...(!shouldDeclare ? imports : []), content].filter(Boolean).join('\n');
    /**
     * A dictionary of fields to pick from an object
     */
    function printDefinedFields() {
        return buildBlock({
            name: `interface DefinedFields`,
            lines: [...visited.objects, ...visited.interfaces].map(typeName => `${typeName}: ${printPicks(typeName, {
                ...picks.objects,
                ...picks.interfaces,
            })};`),
        });
    }
    /**
     * A dictionary of values to pick from an enum
     */
    function printDefinedEnumValues() {
        return buildBlock({
            name: `interface DefinedEnumValues`,
            lines: visited.enums.map(typeName => `${typeName}: ${printPicks(typeName, picks.enums)};`),
        });
    }
    function encapsulateTypeName(typeName) {
        if (encapsulate === 'prefix') {
            return `${changeCaseAll.pascalCase(name)}_${typeName}`;
        }
        return typeName;
    }
    /**
     * A dictionary of fields to pick from an input
     */
    function printDefinedInputFields() {
        return buildBlock({
            name: `interface DefinedInputFields`,
            lines: visited.inputs.map(typeName => `${typeName}: ${printPicks(typeName, picks.inputs)};`),
        });
    }
    /**
     * Prints signatures of schema types with picks
     */
    function printSchemaTypes(types) {
        return types
            .filter(type => !visited.scalars.includes(type))
            .map(printExportType)
            .join('\n');
    }
    function printResolveSignaturesPerType(registry) {
        return [
            [...registry.objects, ...registry.interfaces]
                .map(name => printResolverType(name, 'DefinedFields', !rootTypes.includes(name) && defined.objects.includes(name) ? ` | '__isTypeOf'` : ''))
                .join('\n'),
        ].join('\n');
    }
    function printScalars(registry) {
        if (!registry.scalars.length) {
            return '';
        }
        return [
            `export type ${encapsulateTypeName('Scalars')} = Pick<${importNamespace}.Scalars, ${registry.scalars
                .map(withQuotes)
                .join(' | ')}>;`,
            ...registry.scalars.map(scalar => {
                const convertedName = baseVisitor.convertName(scalar, {
                    suffix: 'ScalarConfig',
                });
                return `export type ${encapsulateTypeName(convertedName)} = ${importNamespace}.${convertedName};`;
            }),
        ].join('\n');
    }
    /**
     * Aggregation of type resolver signatures
     */
    function printResolversType(registry) {
        const lines = [];
        for (const kind in registry) {
            const k = kind;
            if (registry.hasOwnProperty(k) && resolverKeys.includes(k)) {
                const types = registry[k];
                types.forEach(typeName => {
                    if (k === 'enums') {
                        return;
                    }
                    else if (k === 'scalars') {
                        lines.push(`${typeName}?: ${encapsulateTypeName(importNamespace)}.Resolvers['${typeName}'];`);
                    }
                    else {
                        lines.push(`${typeName}?: ${encapsulateTypeName(typeName)}Resolvers;`);
                    }
                });
            }
        }
        return buildBlock({
            name: `export interface ${encapsulateTypeName('Resolvers')}`,
            lines,
        });
    }
    /**
     * Signature for a map of resolve middlewares
     */
    function printResolveMiddlewareMap() {
        const wildcardField = printResolveMiddlewareRecord(withQuotes('*'));
        const blocks = [buildBlock({ name: `${withQuotes('*')}?:`, lines: [wildcardField] })];
        // Type.Field
        for (const typeName in picks.objects) {
            if (picks.objects.hasOwnProperty(typeName)) {
                const fields = picks.objects[typeName];
                const lines = [wildcardField].concat(fields.map(field => printResolveMiddlewareRecord(field)));
                blocks.push(buildBlock({
                    name: `${typeName}?:`,
                    lines,
                }));
            }
        }
        return buildBlock({
            name: `export interface ${encapsulateTypeName('MiddlewareMap')}`,
            lines: blocks,
        });
    }
    function printResolveMiddlewareRecord(path) {
        return `${path}?: gm.Middleware[];`;
    }
    function printResolverType(typeName, picksTypeName, extraKeys = '') {
        return `export type ${encapsulateTypeName(`${typeName}Resolvers`)} = Pick<${importNamespace}.${baseVisitor.convertName(typeName, {
            suffix: 'Resolvers',
        })}, ${picksTypeName}['${typeName}']${extraKeys}>;`;
    }
    function printPicks(typeName, records) {
        return records[typeName].filter(unique).map(withQuotes).join(' | ');
    }
    function printTypeBody(typeName) {
        const coreType = `${importNamespace}.${baseVisitor.convertName(typeName, {
            useTypesSuffix: true,
            useTypesPrefix: true,
        })}`;
        if (external.enums.includes(typeName) || external.objects.includes(typeName)) {
            if (schema && graphql.isScalarType(schema.getType(typeName))) {
                return `${importNamespace}.Scalars['${typeName}']`;
            }
            return coreType;
        }
        if (defined.enums.includes(typeName) && picks.enums[typeName]) {
            return `DefinedEnumValues['${typeName}']`;
        }
        if (defined.objects.includes(typeName) && picks.objects[typeName]) {
            return `Pick<${coreType}, DefinedFields['${typeName}']>`;
        }
        if (defined.interfaces.includes(typeName) && picks.interfaces[typeName]) {
            return `Pick<${coreType}, DefinedFields['${typeName}']>`;
        }
        if (defined.inputs.includes(typeName) && picks.inputs[typeName]) {
            return `Pick<${coreType}, DefinedInputFields['${typeName}']>`;
        }
        return coreType;
    }
    function printExportType(typeName) {
        return `export type ${encapsulateTypeName(typeName)} = ${printTypeBody(typeName)};`;
    }
    //
    //
    //
    // Utils
    //
    //
    //
    function collectFields(node, picksObj) {
        const name = node.name.value;
        if (node.fields) {
            if (!picksObj[name]) {
                picksObj[name] = [];
            }
            node.fields.forEach(field => {
                picksObj[name].push(field.name.value);
            });
        }
    }
    function collectValuesFromEnum(node) {
        const name = node.name.value;
        if (node.values) {
            if (!picks.enums[name]) {
                picks.enums[name] = [];
            }
            node.values.forEach(field => {
                picks.enums[name].push(field.name.value);
            });
        }
    }
    function collectTypeDefinition(node) {
        const name = node.name.value;
        switch (node.kind) {
            case graphql.Kind.OBJECT_TYPE_DEFINITION: {
                defined.objects.push(name);
                collectFields(node, picks.objects);
                break;
            }
            case graphql.Kind.ENUM_TYPE_DEFINITION: {
                defined.enums.push(name);
                collectValuesFromEnum(node);
                break;
            }
            case graphql.Kind.INPUT_OBJECT_TYPE_DEFINITION: {
                defined.inputs.push(name);
                collectFields(node, picks.inputs);
                break;
            }
            case graphql.Kind.SCALAR_TYPE_DEFINITION: {
                defined.scalars.push(name);
                break;
            }
            case graphql.Kind.INTERFACE_TYPE_DEFINITION: {
                defined.interfaces.push(name);
                collectFields(node, picks.interfaces);
                break;
            }
            case graphql.Kind.UNION_TYPE_DEFINITION: {
                defined.unions.push(name);
                break;
            }
        }
    }
    function collectTypeExtension(node) {
        const name = node.name.value;
        switch (node.kind) {
            case graphql.Kind.OBJECT_TYPE_EXTENSION: {
                collectFields(node, picks.objects);
                // Do not include root types as extensions
                // so we can use them in DefinedFields
                if (rootTypes.includes(name)) {
                    pushUnique(defined.objects, name);
                    return;
                }
                pushUnique(extended.objects, name);
                break;
            }
            case graphql.Kind.ENUM_TYPE_EXTENSION: {
                collectValuesFromEnum(node);
                pushUnique(extended.enums, name);
                break;
            }
            case graphql.Kind.INPUT_OBJECT_TYPE_EXTENSION: {
                collectFields(node, picks.inputs);
                pushUnique(extended.inputs, name);
                break;
            }
            case graphql.Kind.INTERFACE_TYPE_EXTENSION: {
                collectFields(node, picks.interfaces);
                pushUnique(extended.interfaces, name);
                break;
            }
            case graphql.Kind.UNION_TYPE_EXTENSION: {
                pushUnique(extended.unions, name);
                break;
            }
        }
    }
}

const preset = {
    buildGeneratesSection: options => {
        const { baseOutputDir } = options;
        const { baseTypesPath, encapsulateModuleTypes } = options.presetConfig;
        const cwd = path.resolve(options.presetConfig.cwd || process.cwd());
        const importTypesNamespace = options.presetConfig.importTypesNamespace || 'Types';
        if (!baseTypesPath) {
            throw new Error(`Preset "graphql-modules" requires you to specify "baseTypesPath" configuration and point it to your base types file (generated by "typescript" plugin)!`);
        }
        if (!options.schemaAst || !options.schemaAst.extensions.sources) {
            throw new Error(`Preset "graphql-modules" requires to use GraphQL SDL`);
        }
        const sourcesByModuleMap = groupSourcesByModule(options.schemaAst.extensions.extendedSources, baseOutputDir);
        const modules = Object.keys(sourcesByModuleMap);
        const baseVisitor = new visitorPluginCommon.BaseVisitor(options.config, {});
        // One file with an output from all plugins
        const baseOutput = {
            filename: path.resolve(cwd, baseOutputDir, baseTypesPath),
            schema: options.schema,
            documents: options.documents,
            plugins: [
                ...options.plugins,
                {
                    'modules-exported-scalars': {},
                },
            ],
            pluginMap: {
                ...options.pluginMap,
                'modules-exported-scalars': {
                    plugin: schema => {
                        const typeMap = schema.getTypeMap();
                        return Object.keys(typeMap)
                            .map(t => {
                            if (t && typeMap[t] && graphql.isScalarType(typeMap[t]) && !isGraphQLPrimitive(t)) {
                                const convertedName = baseVisitor.convertName(t);
                                return `export type ${convertedName} = Scalars["${t}"];`;
                            }
                            return null;
                        })
                            .filter(Boolean)
                            .join('\n');
                    },
                },
            },
            config: {
                ...(options.config || {}),
                enumsAsTypes: true,
            },
            schemaAst: options.schemaAst,
        };
        const baseTypesFilename = baseTypesPath.replace(/\.(js|ts|d.ts)$/, '');
        const baseTypesDir = stripFilename(baseOutput.filename);
        // One file per each module
        const outputs = modules.map(moduleName => {
            const filename = path.resolve(cwd, baseOutputDir, moduleName, options.presetConfig.filename);
            const dirpath = stripFilename(filename);
            const relativePath = path.relative(dirpath, baseTypesDir);
            const importPath = options.presetConfig.importBaseTypesFrom || normalize(path.join(relativePath, baseTypesFilename));
            const sources = sourcesByModuleMap[moduleName];
            const moduleDocument = graphql.concatAST(sources.map(source => source.document));
            const shouldDeclare = filename.endsWith('.d.ts');
            return {
                filename,
                schema: options.schema,
                documents: [],
                plugins: [
                    ...options.plugins.filter(p => typeof p === 'object' && !!p.add),
                    {
                        'graphql-modules-plugin': {},
                    },
                ],
                pluginMap: {
                    ...options.pluginMap,
                    'graphql-modules-plugin': {
                        plugin: schema => {
                            var _a, _b, _c;
                            return buildModule(moduleName, moduleDocument, {
                                importNamespace: importTypesNamespace,
                                importPath,
                                encapsulate: encapsulateModuleTypes || 'namespace',
                                shouldDeclare,
                                schema,
                                baseVisitor,
                                rootTypes: [
                                    (_a = schema.getQueryType()) === null || _a === void 0 ? void 0 : _a.name,
                                    (_b = schema.getMutationType()) === null || _b === void 0 ? void 0 : _b.name,
                                    (_c = schema.getSubscriptionType()) === null || _c === void 0 ? void 0 : _c.name,
                                ].filter(Boolean),
                            });
                        },
                    },
                },
                config: options.config,
                schemaAst: options.schemaAst,
            };
        });
        return [baseOutput].concat(outputs);
    },
};

exports.default = preset;
exports.preset = preset;
