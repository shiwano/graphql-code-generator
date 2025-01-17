'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

function _interopNamespace(e) {
    if (e && e.__esModule) { return e; } else {
        var n = {};
        if (e) {
            Object.keys(e).forEach(function (k) {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () {
                        return e[k];
                    }
                });
            });
        }
        n['default'] = e;
        return n;
    }
}

const pluginHelpers = require('@graphql-codegen/plugin-helpers');
const core = require('@graphql-codegen/core');
const chalk = _interopDefault(require('chalk'));
const logSymbols = _interopDefault(require('log-symbols'));
const ansiEscapes = _interopDefault(require('ansi-escapes'));
const wrapAnsi = _interopDefault(require('wrap-ansi'));
const commonTags = require('common-tags');
const tsLog = require('ts-log');
const UpdateRenderer = _interopDefault(require('listr-update-renderer'));
const graphql = require('graphql');
const path = require('path');
const path__default = _interopDefault(path);
const cosmiconfig = require('cosmiconfig');
const stringEnvInterpolation = require('string-env-interpolation');
const yargs = _interopDefault(require('yargs'));
const graphqlConfig = require('graphql-config');
const apolloEngineLoader = require('@graphql-tools/apollo-engine-loader');
const codeFileLoader = require('@graphql-tools/code-file-loader');
const gitLoader = require('@graphql-tools/git-loader');
const githubLoader = require('@graphql-tools/github-loader');
const prismaLoader = require('@graphql-tools/prisma-loader');
const load = require('@graphql-tools/load');
const graphqlFileLoader = require('@graphql-tools/graphql-file-loader');
const jsonFileLoader = require('@graphql-tools/json-file-loader');
const urlLoader = require('@graphql-tools/url-loader');
const yaml = _interopDefault(require('yaml'));
const module$1 = require('module');
const fs = require('fs');
const fs__default = _interopDefault(fs);
const Listr = _interopDefault(require('listr'));
const child_process = require('child_process');
const isGlob = _interopDefault(require('is-glob'));
const debounce = _interopDefault(require('debounce'));
const utils = require('@graphql-tools/utils');
const mkdirp = _interopDefault(require('mkdirp'));
const crypto = require('crypto');
const inquirer = _interopDefault(require('inquirer'));
const detectIndent = _interopDefault(require('detect-indent'));
const getLatestVersion = _interopDefault(require('latest-version'));

/**
Indent each line in a string.
@param string - The string to indent.
@param count - How many times you want `options.indent` repeated. Default: `1`.
@example
```
import indentString from 'indent-string';
indentString('Unicorns\nRainbows', 4);
//=> '    Unicorns\n    Rainbows'
indentString('Unicorns\nRainbows', 4, {indent: '♥'});
//=> '♥♥♥♥Unicorns\n♥♥♥♥Rainbows'
```
*/
function indentString(string, count = 1, options = {}) {
    const { indent = ' ', includeEmptyLines = false } = options;
    if (typeof string !== 'string') {
        throw new TypeError(`Expected \`input\` to be a \`string\`, got \`${typeof string}\``);
    }
    if (typeof count !== 'number') {
        throw new TypeError(`Expected \`count\` to be a \`number\`, got \`${typeof count}\``);
    }
    if (count < 0) {
        throw new RangeError(`Expected \`count\` to be at least 0, got \`${count}\``);
    }
    if (typeof indent !== 'string') {
        throw new TypeError(`Expected \`options.indent\` to be a \`string\`, got \`${typeof indent}\``);
    }
    if (count === 0) {
        return string;
    }
    const regex = includeEmptyLines ? /^/gm : /^(?!\s*$)/gm;
    return string.replace(regex, indent.repeat(count));
}

let logger;
function getLogger() {
    return logger || tsLog.dummyLogger;
}
useWinstonLogger();
function useWinstonLogger() {
    if (logger && logger.levels) {
        return;
    }
    logger = console;
}

let queue = [];
function debugLog(message, ...meta) {
    if (!process.env.GQL_CODEGEN_NODEBUG && process.env.DEBUG !== undefined) {
        queue.push({
            message,
            meta,
        });
    }
}
function printLogs() {
    if (!process.env.GQL_CODEGEN_NODEBUG && process.env.DEBUG !== undefined) {
        queue.forEach(log => {
            getLogger().info(log.message, ...log.meta);
        });
        resetLogs();
    }
}
function resetLogs() {
    queue = [];
}

class Renderer {
    constructor(tasks, options) {
        this.updateRenderer = new UpdateRenderer(tasks, options);
    }
    render() {
        return this.updateRenderer.render();
    }
    end(err) {
        this.updateRenderer.end(err);
        if (typeof err === 'undefined') {
            logUpdate.clear();
            return;
        }
        // persist the output
        logUpdate.done();
        // show errors
        if (err) {
            const errorCount = err.errors ? err.errors.length : 0;
            if (errorCount > 0) {
                const count = indentString(chalk.red.bold(`Found ${errorCount} error${errorCount > 1 ? 's' : ''}`), 1);
                const details = err.errors
                    .map(error => {
                    debugLog(`[CLI] Exited with an error`, error);
                    return { msg: pluginHelpers.isDetailedError(error) ? error.details : null, rawError: error };
                })
                    .map(({ msg, rawError }, i) => {
                    const source = err.errors[i].source;
                    msg = msg ? chalk.gray(indentString(commonTags.stripIndent(`${msg}`), 4)) : null;
                    const stack = rawError.stack ? chalk.gray(indentString(commonTags.stripIndent(rawError.stack), 4)) : null;
                    if (source) {
                        const sourceOfError = typeof source === 'string' ? source : source.name;
                        const title = indentString(`${logSymbols.error} ${sourceOfError}`, 2);
                        return [title, msg, stack, stack].filter(Boolean).join('\n');
                    }
                    return [msg, stack].filter(Boolean).join('\n');
                })
                    .join('\n\n');
                logUpdate.emit(['', count, details, ''].join('\n\n'));
            }
            else {
                const details = err.details ? err.details : '';
                logUpdate.emit(`${chalk.red.bold(`${indentString(err.message, 2)}`)}\n${details}\n${chalk.grey(err.stack)}`);
            }
        }
        logUpdate.done();
        printLogs();
    }
}
const render = tasks => {
    for (const task of tasks) {
        task.subscribe(event => {
            if (event.type === 'SUBTASKS') {
                render(task.subtasks);
                return;
            }
            if (event.type === 'DATA') {
                logUpdate.emit(chalk.dim(`${event.data}`));
            }
            logUpdate.done();
        }, err => {
            logUpdate.emit(err);
            logUpdate.done();
        });
    }
};
class ErrorRenderer {
    constructor(tasks, _options) {
        this.tasks = tasks;
    }
    render() {
        render(this.tasks);
    }
    static get nonTTY() {
        return true;
    }
    end() { }
}
class LogUpdate {
    constructor() {
        this.stream = process.stdout;
        // state
        this.previousLineCount = 0;
        this.previousOutput = '';
        this.previousWidth = this.getWidth();
    }
    emit(...args) {
        let output = args.join(' ') + '\n';
        const width = this.getWidth();
        if (output === this.previousOutput && this.previousWidth === width) {
            return;
        }
        this.previousOutput = output;
        this.previousWidth = width;
        output = wrapAnsi(output, width, {
            trim: false,
            hard: true,
            wordWrap: false,
        });
        this.stream.write(ansiEscapes.eraseLines(this.previousLineCount) + output);
        this.previousLineCount = output.split('\n').length;
    }
    clear() {
        this.stream.write(ansiEscapes.eraseLines(this.previousLineCount));
        this.previousOutput = '';
        this.previousWidth = this.getWidth();
        this.previousLineCount = 0;
    }
    done() {
        this.previousOutput = '';
        this.previousWidth = this.getWidth();
        this.previousLineCount = 0;
    }
    getWidth() {
        const { columns } = this.stream;
        if (!columns) {
            return 80;
        }
        return columns;
    }
}
const logUpdate = new LogUpdate();

async function getPluginByName(name, pluginLoader) {
    const possibleNames = [
        `@graphql-codegen/${name}`,
        `@graphql-codegen/${name}-template`,
        `@graphql-codegen/${name}-plugin`,
        `graphql-codegen-${name}`,
        `graphql-codegen-${name}-template`,
        `graphql-codegen-${name}-plugin`,
        `codegen-${name}`,
        `codegen-${name}-template`,
        name,
    ];
    const possibleModules = possibleNames.concat(path.resolve(process.cwd(), name));
    for (const moduleName of possibleModules) {
        try {
            return await pluginLoader(moduleName);
        }
        catch (err) {
            if (err.code !== 'MODULE_NOT_FOUND') {
                throw new pluginHelpers.DetailedError(`Unable to load template plugin matching ${name}`, `
              Unable to load template plugin matching '${name}'.
              Reason:
                ${err.message}
            `);
            }
        }
    }
    const possibleNamesMsg = possibleNames
        .map(name => `
        - ${name}
    `.trimRight())
        .join('');
    throw new pluginHelpers.DetailedError(`Unable to find template plugin matching ${name}`, `
        Unable to find template plugin matching '${name}'
        Install one of the following packages:

        ${possibleNamesMsg}
      `);
}

async function getPresetByName(name, loader) {
    const possibleNames = [`@graphql-codegen/${name}`, `@graphql-codegen/${name}-preset`, name];
    for (const moduleName of possibleNames) {
        try {
            const loaded = await loader(moduleName);
            if (loaded && loaded.preset) {
                return loaded.preset;
            }
            else if (loaded && loaded.default) {
                return loaded.default;
            }
            return loaded;
        }
        catch (err) {
            if (err.code !== 'MODULE_NOT_FOUND') {
                throw new pluginHelpers.DetailedError(`Unable to load preset matching ${name}`, `
              Unable to load preset matching '${name}'.
              Reason:
                ${err.message}
            `);
            }
        }
    }
    const possibleNamesMsg = possibleNames
        .map(name => `
        - ${name}
    `.trimRight())
        .join('');
    throw new pluginHelpers.DetailedError(`Unable to find preset matching ${name}`, `
        Unable to find preset matching '${name}'
        Install one of the following packages:

        ${possibleNamesMsg}
      `);
}

const CodegenExtension = (api) => {
    // Schema
    api.loaders.schema.register(new codeFileLoader.CodeFileLoader({
        pluckConfig: {
            skipIndent: true,
        },
    }));
    api.loaders.schema.register(new gitLoader.GitLoader());
    api.loaders.schema.register(new githubLoader.GithubLoader());
    api.loaders.schema.register(new apolloEngineLoader.ApolloEngineLoader());
    api.loaders.schema.register(new prismaLoader.PrismaLoader());
    // Documents
    api.loaders.documents.register(new codeFileLoader.CodeFileLoader({
        pluckConfig: {
            skipIndent: true,
        },
    }));
    api.loaders.documents.register(new gitLoader.GitLoader());
    api.loaders.documents.register(new githubLoader.GithubLoader());
    return {
        name: 'codegen',
    };
};
async function findAndLoadGraphQLConfig(filepath) {
    const config = await graphqlConfig.loadConfig({
        filepath,
        rootDir: process.cwd(),
        extensions: [CodegenExtension],
        throwOnEmpty: false,
        throwOnMissing: false,
    });
    if (isGraphQLConfig(config)) {
        return config;
    }
}
// Kamil: user might load a config that is not GraphQL Config
//        so we need to check if it's a regular config or not
function isGraphQLConfig(config) {
    if (!config) {
        return false;
    }
    try {
        return config.getDefault().hasExtension('codegen');
    }
    catch (e) { }
    try {
        for (const projectName in config.projects) {
            if (config.projects.hasOwnProperty(projectName)) {
                const project = config.projects[projectName];
                if (project.hasExtension('codegen')) {
                    return true;
                }
            }
        }
    }
    catch (e) { }
    return false;
}

const defaultSchemaLoadOptions = {
    assumeValidSDL: true,
    sort: true,
    convertExtensions: true,
    includeSources: true,
};
const defaultDocumentsLoadOptions = {
    sort: true,
    skipGraphQLImport: true,
};
async function loadSchema(schemaPointers, config) {
    try {
        const loaders = [
            new codeFileLoader.CodeFileLoader(),
            new gitLoader.GitLoader(),
            new githubLoader.GithubLoader(),
            new graphqlFileLoader.GraphQLFileLoader(),
            new jsonFileLoader.JsonFileLoader(),
            new urlLoader.UrlLoader(),
            new apolloEngineLoader.ApolloEngineLoader(),
            new prismaLoader.PrismaLoader(),
        ];
        const schema = await load.loadSchema(schemaPointers, {
            ...defaultSchemaLoadOptions,
            loaders,
            ...config,
            ...config.config,
        });
        return schema;
    }
    catch (e) {
        throw new pluginHelpers.DetailedError('Failed to load schema', `
        Failed to load schema from ${Object.keys(schemaPointers).join(',')}:

        ${e.message || e}
        ${e.stack || ''}
    
        GraphQL Code Generator supports:
          - ES Modules and CommonJS exports (export as default or named export "schema")
          - Introspection JSON File
          - URL of GraphQL endpoint
          - Multiple files with type definitions (glob expression)
          - String in config file
    
        Try to use one of above options and run codegen again.
    
      `);
    }
}
async function loadDocuments(documentPointers, config) {
    const loaders = [
        new codeFileLoader.CodeFileLoader({
            pluckConfig: {
                skipIndent: true,
            },
        }),
        new gitLoader.GitLoader(),
        new githubLoader.GithubLoader(),
        new graphqlFileLoader.GraphQLFileLoader(),
    ];
    const ignore = [];
    for (const generatePath of Object.keys(config.generates)) {
        if (path.extname(generatePath) === '') {
            // we omit paths that don't resolve to a specific file
            continue;
        }
        ignore.push(path.join(process.cwd(), generatePath));
    }
    const loadedFromToolkit = await load.loadDocuments(documentPointers, {
        ...defaultDocumentsLoadOptions,
        ignore,
        loaders,
        ...config,
        ...config.config,
    });
    return loadedFromToolkit;
}

function generateSearchPlaces(moduleName) {
    const extensions = ['json', 'yaml', 'yml', 'js', 'config.js'];
    // gives codegen.json...
    const regular = extensions.map(ext => `${moduleName}.${ext}`);
    // gives .codegenrc.json... but no .codegenrc.config.js
    const dot = extensions.filter(ext => ext !== 'config.js').map(ext => `.${moduleName}rc.${ext}`);
    return [...regular.concat(dot), 'package.json'];
}
function customLoader(ext) {
    function loader(filepath, content) {
        if (typeof process !== 'undefined' && 'env' in process) {
            content = stringEnvInterpolation.env(content);
        }
        if (ext === 'json') {
            return cosmiconfig.defaultLoaders['.json'](filepath, content);
        }
        if (ext === 'yaml') {
            try {
                const result = yaml.parse(content, { prettyErrors: true, merge: true });
                return result;
            }
            catch (error) {
                error.message = `YAML Error in ${filepath}:\n${error.message}`;
                throw error;
            }
        }
        if (ext === 'js') {
            return cosmiconfig.defaultLoaders['.js'](filepath, content);
        }
    }
    return loader;
}
async function loadContext(configFilePath) {
    const moduleName = 'codegen';
    const cosmi = cosmiconfig.cosmiconfig(moduleName, {
        searchPlaces: generateSearchPlaces(moduleName),
        packageProp: moduleName,
        loaders: {
            '.json': customLoader('json'),
            '.yaml': customLoader('yaml'),
            '.yml': customLoader('yaml'),
            '.js': customLoader('js'),
            noExt: customLoader('yaml'),
        },
    });
    const graphqlConfig = await findAndLoadGraphQLConfig(configFilePath);
    if (graphqlConfig) {
        return new CodegenContext({
            graphqlConfig,
        });
    }
    const result = await (configFilePath ? cosmi.load(configFilePath) : cosmi.search(process.cwd()));
    if (!result) {
        if (configFilePath) {
            throw new pluginHelpers.DetailedError(`Config ${configFilePath} does not exist`, `
        Config ${configFilePath} does not exist.
  
          $ graphql-codegen --config ${configFilePath}
  
        Please make sure the --config points to a correct file.
      `);
        }
        throw new pluginHelpers.DetailedError(`Unable to find Codegen config file!`, `
        Please make sure that you have a configuration file under the current directory! 
      `);
    }
    if (result.isEmpty) {
        throw new pluginHelpers.DetailedError(`Found Codegen config file but it was empty!`, `
        Please make sure that you have a valid configuration file under the current directory!
      `);
    }
    return new CodegenContext({
        filepath: result.filepath,
        config: result.config,
    });
}
function getCustomConfigPath(cliFlags) {
    const configFile = cliFlags.config;
    return configFile ? path.resolve(process.cwd(), configFile) : null;
}
function buildOptions() {
    return {
        c: {
            alias: 'config',
            type: 'string',
            describe: 'Path to GraphQL codegen YAML config file, defaults to "codegen.yml" on the current directory',
        },
        w: {
            alias: 'watch',
            describe: 'Watch for changes and execute generation automatically. You can also specify a glob expreession for custom watch list.',
            coerce: (watch) => {
                if (watch === 'false') {
                    return false;
                }
                if (typeof watch === 'string' || Array.isArray(watch)) {
                    return watch;
                }
                return !!watch;
            },
        },
        r: {
            alias: 'require',
            describe: 'Loads specific require.extensions before running the codegen and reading the configuration',
            type: 'array',
            default: [],
        },
        o: {
            alias: 'overwrite',
            describe: 'Overwrites existing files',
            type: 'boolean',
        },
        s: {
            alias: 'silent',
            describe: 'Suppresses printing errors',
            type: 'boolean',
        },
        e: {
            alias: 'errors-only',
            describe: 'Only print errors',
            type: 'boolean',
        },
        p: {
            alias: 'project',
            describe: 'Name of a project in GraphQL Config',
            type: 'string',
        },
    };
}
function parseArgv(argv = process.argv) {
    return yargs.options(buildOptions()).parse(argv);
}
async function createContext(cliFlags = parseArgv(process.argv)) {
    if (cliFlags.require && cliFlags.require.length > 0) {
        const relativeRequire = module$1.createRequire(process.cwd());
        await Promise.all(cliFlags.require.map(mod => new Promise(function (resolve) { resolve(_interopNamespace(require(relativeRequire.resolve(mod, {
            paths: [process.cwd()],
        })))); })));
    }
    const customConfigPath = getCustomConfigPath(cliFlags);
    const context = await loadContext(customConfigPath);
    updateContextWithCliFlags(context, cliFlags);
    return context;
}
function updateContextWithCliFlags(context, cliFlags) {
    const config = {
        configFilePath: context.filepath,
    };
    if (cliFlags.watch) {
        config.watch = cliFlags.watch;
    }
    if (cliFlags.overwrite === true) {
        config.overwrite = cliFlags.overwrite;
    }
    if (cliFlags.silent === true) {
        config.silent = cliFlags.silent;
    }
    if (cliFlags.errorsOnly === true) {
        config.errorsOnly = cliFlags.errorsOnly;
    }
    if (cliFlags.project) {
        context.useProject(cliFlags.project);
    }
    context.updateConfig(config);
}
class CodegenContext {
    constructor({ config, graphqlConfig, filepath, }) {
        this._pluginContext = {};
        this._config = config;
        this._graphqlConfig = graphqlConfig;
        this.filepath = this._graphqlConfig ? this._graphqlConfig.filepath : filepath;
        this.cwd = this._graphqlConfig ? this._graphqlConfig.dirpath : process.cwd();
    }
    useProject(name) {
        this._project = name;
    }
    getConfig(extraConfig) {
        if (!this.config) {
            if (this._graphqlConfig) {
                const project = this._graphqlConfig.getProject(this._project);
                this.config = {
                    ...project.extension('codegen'),
                    schema: project.schema,
                    documents: project.documents,
                    pluginContext: this._pluginContext,
                };
            }
            else {
                this.config = { ...this._config, pluginContext: this._pluginContext };
            }
        }
        return {
            ...extraConfig,
            ...this.config,
        };
    }
    updateConfig(config) {
        this.config = {
            ...this.getConfig(),
            ...config,
        };
    }
    getPluginContext() {
        return this._pluginContext;
    }
    async loadSchema(pointer) {
        const config = this.getConfig(defaultSchemaLoadOptions);
        if (this._graphqlConfig) {
            // TODO: SchemaWithLoader won't work here
            return this._graphqlConfig.getProject(this._project).loadSchema(pointer, 'GraphQLSchema', config);
        }
        return loadSchema(pointer, config);
    }
    async loadDocuments(pointer) {
        const config = this.getConfig(defaultDocumentsLoadOptions);
        if (this._graphqlConfig) {
            // TODO: pointer won't work here
            const documents = await this._graphqlConfig.getProject(this._project).loadDocuments(pointer, config);
            return documents;
        }
        return loadDocuments(pointer, config);
    }
}
function ensureContext(input) {
    return input instanceof CodegenContext ? input : new CodegenContext({ config: input });
}

const makeDefaultLoader = (from) => {
    if (fs__default.statSync(from).isDirectory()) {
        from = path__default.join(from, '__fake.js');
    }
    const relativeRequire = module$1.createRequire(from);
    return (mod) => {
        return new Promise(function (resolve) { resolve(_interopNamespace(require(relativeRequire.resolve(mod)))); });
    };
};
async function executeCodegen(input) {
    function wrapTask(task, source) {
        return async () => {
            try {
                await Promise.resolve().then(() => task());
            }
            catch (error) {
                if (source && !(error instanceof graphql.GraphQLError)) {
                    error.source = source;
                }
                throw error;
            }
        };
    }
    const context = ensureContext(input);
    const config = context.getConfig();
    const pluginContext = context.getPluginContext();
    const result = [];
    const commonListrOptions = {
        exitOnError: true,
    };
    let listr;
    if (process.env.VERBOSE) {
        listr = new Listr({
            ...commonListrOptions,
            renderer: 'verbose',
            nonTTYRenderer: 'verbose',
        });
    }
    else if (process.env.NODE_ENV === 'test') {
        listr = new Listr({
            ...commonListrOptions,
            renderer: 'silent',
            nonTTYRenderer: 'silent',
        });
    }
    else {
        listr = new Listr({
            ...commonListrOptions,
            renderer: config.silent ? 'silent' : config.errorsOnly ? ErrorRenderer : Renderer,
            nonTTYRenderer: config.silent ? 'silent' : 'default',
            collapse: true,
            clearOutput: false,
        });
    }
    let rootConfig = {};
    let rootSchemas;
    let rootDocuments;
    const generates = {};
    async function normalize() {
        /* Load Require extensions */
        const requireExtensions = pluginHelpers.normalizeInstanceOrArray(config.require);
        const loader = makeDefaultLoader(context.cwd);
        for (const mod of requireExtensions) {
            await loader(mod);
        }
        /* Root plugin  config */
        rootConfig = config.config || {};
        /* Normalize root "schema" field */
        rootSchemas = pluginHelpers.normalizeInstanceOrArray(config.schema);
        /* Normalize root "documents" field */
        rootDocuments = pluginHelpers.normalizeInstanceOrArray(config.documents);
        /* Normalize "generators" field */
        const generateKeys = Object.keys(config.generates || {});
        if (generateKeys.length === 0) {
            throw new pluginHelpers.DetailedError('Invalid Codegen Configuration!', `
        Please make sure that your codegen config file contains the "generates" field, with a specification for the plugins you need.

        It should looks like that:

        schema:
          - my-schema.graphql
        generates:
          my-file.ts:
            - plugin1
            - plugin2
            - plugin3
        `);
        }
        for (const filename of generateKeys) {
            const output = (generates[filename] = pluginHelpers.normalizeOutputParam(config.generates[filename]));
            if (!output.preset && (!output.plugins || output.plugins.length === 0)) {
                throw new pluginHelpers.DetailedError('Invalid Codegen Configuration!', `
          Please make sure that your codegen config file has defined plugins list for output "${filename}".

          It should looks like that:

          schema:
            - my-schema.graphql
          generates:
            my-file.ts:
              - plugin1
              - plugin2
              - plugin3
          `);
            }
        }
        if (rootSchemas.length === 0 &&
            Object.keys(generates).some(filename => !generates[filename].schema || generates[filename].schema.length === 0)) {
            throw new pluginHelpers.DetailedError('Invalid Codegen Configuration!', `
        Please make sure that your codegen config file contains either the "schema" field
        or every generated file has its own "schema" field.

        It should looks like that:
        schema:
          - my-schema.graphql

        or:
        generates:
          path/to/output:
            schema: my-schema.graphql
      `);
        }
    }
    listr.add({
        title: 'Parse configuration',
        task: () => normalize(),
    });
    listr.add({
        title: 'Generate outputs',
        task: () => {
            return new Listr(Object.keys(generates).map(filename => {
                const outputConfig = generates[filename];
                const hasPreset = !!outputConfig.preset;
                return {
                    title: hasPreset
                        ? `Generate to ${filename} (using EXPERIMENTAL preset "${outputConfig.preset}")`
                        : `Generate ${filename}`,
                    task: () => {
                        let outputSchemaAst;
                        let outputSchema;
                        const outputFileTemplateConfig = outputConfig.config || {};
                        const outputDocuments = [];
                        const outputSpecificSchemas = pluginHelpers.normalizeInstanceOrArray(outputConfig.schema);
                        const outputSpecificDocuments = pluginHelpers.normalizeInstanceOrArray(outputConfig.documents);
                        return new Listr([
                            {
                                title: 'Load GraphQL schemas',
                                task: wrapTask(async () => {
                                    debugLog(`[CLI] Loading Schemas`);
                                    const schemaPointerMap = {};
                                    const allSchemaUnnormalizedPointers = [...rootSchemas, ...outputSpecificSchemas];
                                    for (const unnormalizedPtr of allSchemaUnnormalizedPointers) {
                                        if (typeof unnormalizedPtr === 'string') {
                                            schemaPointerMap[unnormalizedPtr] = {};
                                        }
                                        else if (typeof unnormalizedPtr === 'object') {
                                            Object.assign(schemaPointerMap, unnormalizedPtr);
                                        }
                                    }
                                    outputSchemaAst = await context.loadSchema(schemaPointerMap);
                                    outputSchema = pluginHelpers.getCachedDocumentNodeFromSchema(outputSchemaAst);
                                }, filename),
                            },
                            {
                                title: 'Load GraphQL documents',
                                task: wrapTask(async () => {
                                    debugLog(`[CLI] Loading Documents`);
                                    const allDocuments = [...rootDocuments, ...outputSpecificDocuments];
                                    const documents = await context.loadDocuments(allDocuments);
                                    if (documents.length > 0) {
                                        outputDocuments.push(...documents);
                                    }
                                }, filename),
                            },
                            {
                                title: 'Generate',
                                task: wrapTask(async () => {
                                    debugLog(`[CLI] Generating output`);
                                    const normalizedPluginsArray = pluginHelpers.normalizeConfig(outputConfig.plugins);
                                    const pluginLoader = config.pluginLoader || makeDefaultLoader(context.cwd);
                                    const pluginPackages = await Promise.all(normalizedPluginsArray.map(plugin => getPluginByName(Object.keys(plugin)[0], pluginLoader)));
                                    const pluginMap = {};
                                    const preset = hasPreset
                                        ? typeof outputConfig.preset === 'string'
                                            ? await getPresetByName(outputConfig.preset, makeDefaultLoader(context.cwd))
                                            : outputConfig.preset
                                        : null;
                                    pluginPackages.forEach((pluginPackage, i) => {
                                        const plugin = normalizedPluginsArray[i];
                                        const name = Object.keys(plugin)[0];
                                        pluginMap[name] = pluginPackage;
                                    });
                                    const mergedConfig = {
                                        ...rootConfig,
                                        ...(typeof outputFileTemplateConfig === 'string'
                                            ? { value: outputFileTemplateConfig }
                                            : outputFileTemplateConfig),
                                    };
                                    let outputs = [];
                                    if (hasPreset) {
                                        outputs = await preset.buildGeneratesSection({
                                            baseOutputDir: filename,
                                            presetConfig: outputConfig.presetConfig || {},
                                            plugins: normalizedPluginsArray,
                                            schema: outputSchema,
                                            schemaAst: outputSchemaAst,
                                            documents: outputDocuments,
                                            config: mergedConfig,
                                            pluginMap,
                                            pluginContext,
                                        });
                                    }
                                    else {
                                        outputs = [
                                            {
                                                filename,
                                                plugins: normalizedPluginsArray,
                                                schema: outputSchema,
                                                schemaAst: outputSchemaAst,
                                                documents: outputDocuments,
                                                config: mergedConfig,
                                                pluginMap,
                                                pluginContext,
                                            },
                                        ];
                                    }
                                    const process = async (outputArgs) => {
                                        const output = await core.codegen(outputArgs);
                                        result.push({
                                            filename: outputArgs.filename,
                                            content: output,
                                            hooks: outputConfig.hooks || {},
                                        });
                                    };
                                    await Promise.all(outputs.map(process));
                                }, filename),
                            },
                        ], {
                            // it stops when one of tasks failed
                            exitOnError: true,
                        });
                    },
                };
            }), {
                // it doesn't stop when one of tasks failed, to finish at least some of outputs
                exitOnError: false,
                // run 4 at once
                concurrent: 4,
            });
        },
    });
    await listr.run();
    return result;
}

const DEFAULT_HOOKS = {
    afterStart: [],
    beforeDone: [],
    onWatchTriggered: [],
    onError: [],
    afterOneFileWrite: [],
    afterAllFileWrite: [],
    beforeOneFileWrite: [],
    beforeAllFileWrite: [],
};
function normalizeHooks(_hooks) {
    const keys = Object.keys({
        ...DEFAULT_HOOKS,
        ...(_hooks || {}),
    });
    return keys.reduce((prev, hookName) => {
        if (typeof _hooks[hookName] === 'string') {
            return {
                ...prev,
                [hookName]: [_hooks[hookName]],
            };
        }
        else if (typeof _hooks[hookName] === 'function') {
            return {
                ...prev,
                [hookName]: [_hooks[hookName]],
            };
        }
        else if (Array.isArray(_hooks[hookName])) {
            return {
                ...prev,
                [hookName]: _hooks[hookName],
            };
        }
        else {
            return prev;
        }
    }, {});
}
function execShellCommand(cmd) {
    return new Promise((resolve, reject) => {
        child_process.exec(cmd, {
            env: {
                ...process.env,
                PATH: `${process.env.PATH}${path.delimiter}${process.cwd()}${path.sep}node_modules${path.sep}.bin`,
            },
        }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(stdout || stderr);
            }
        });
    });
}
async function executeHooks(hookName, scripts = [], args = []) {
    debugLog(`Running lifecycle hook "${hookName}" scripts...`);
    for (const script of scripts) {
        if (typeof script === 'string') {
            debugLog(`Running lifecycle hook "${hookName}" script: ${script} with args: ${args.join(' ')}...`);
            await execShellCommand(`${script} ${args.join(' ')}`);
        }
        else {
            debugLog(`Running lifecycle hook "${hookName}" script: ${script.name} with args: ${args.join(' ')}...`);
            await script(...args);
        }
    }
}
const lifecycleHooks = (_hooks = {}) => {
    const hooks = normalizeHooks(_hooks);
    return {
        afterStart: async () => executeHooks('afterStart', hooks.afterStart),
        onWatchTriggered: async (event, path) => executeHooks('onWatchTriggered', hooks.onWatchTriggered, [event, path]),
        onError: async (error) => executeHooks('onError', hooks.onError, [`"${error}"`]),
        afterOneFileWrite: async (path) => executeHooks('afterOneFileWrite', hooks.afterOneFileWrite, [path]),
        afterAllFileWrite: async (paths) => executeHooks('afterAllFileWrite', hooks.afterAllFileWrite, paths),
        beforeOneFileWrite: async (path) => executeHooks('beforeOneFileWrite', hooks.beforeOneFileWrite, [path]),
        beforeAllFileWrite: async (paths) => executeHooks('beforeAllFileWrite', hooks.beforeAllFileWrite, paths),
        beforeDone: async () => executeHooks('beforeDone', hooks.beforeDone),
    };
};

function log(msg) {
    // double spaces to inline the message with Listr
    getLogger().info(`  ${msg}`);
}
function emitWatching() {
    log(`${logSymbols.info} Watching for changes...`);
}
const createWatcher = (initalContext, onNext) => {
    debugLog(`[Watcher] Starting watcher...`);
    let config = initalContext.getConfig();
    const files = [initalContext.filepath].filter(a => a);
    const documents = pluginHelpers.normalizeInstanceOrArray(config.documents);
    const schemas = pluginHelpers.normalizeInstanceOrArray(config.schema);
    // Add schemas and documents from "generates"
    Object.keys(config.generates)
        .map(filename => pluginHelpers.normalizeOutputParam(config.generates[filename]))
        .forEach(conf => {
        schemas.push(...pluginHelpers.normalizeInstanceOrArray(conf.schema));
        documents.push(...pluginHelpers.normalizeInstanceOrArray(conf.documents));
    });
    if (documents) {
        documents.forEach(doc => {
            if (typeof doc === 'string') {
                files.push(doc);
            }
            else {
                files.push(...Object.keys(doc));
            }
        });
    }
    schemas.forEach((schema) => {
        if (isGlob(schema) || utils.isValidPath(schema)) {
            files.push(schema);
        }
    });
    if (typeof config.watch !== 'boolean') {
        files.push(...pluginHelpers.normalizeInstanceOrArray(config.watch));
    }
    let watcher;
    const runWatcher = async () => {
        var _a, _b;
        const chokidar = await new Promise(function (resolve) { resolve(_interopNamespace(require('chokidar'))); });
        let isShutdown = false;
        const debouncedExec = debounce(() => {
            if (!isShutdown) {
                executeCodegen(initalContext)
                    .then(onNext, () => Promise.resolve())
                    .then(() => emitWatching());
            }
        }, 100);
        emitWatching();
        const ignored = [];
        Object.keys(config.generates)
            .map(filename => ({ filename, config: pluginHelpers.normalizeOutputParam(config.generates[filename]) }))
            .forEach(entry => {
            if (entry.config.preset) {
                const extension = entry.config.presetConfig && entry.config.presetConfig.extension;
                if (extension) {
                    ignored.push(path.join(entry.filename, '**', '*' + extension));
                }
            }
            else {
                ignored.push(entry.filename);
            }
        });
        watcher = chokidar.watch(files, {
            persistent: true,
            ignoreInitial: true,
            followSymlinks: true,
            cwd: process.cwd(),
            disableGlobbing: false,
            usePolling: (_a = config.watchConfig) === null || _a === void 0 ? void 0 : _a.usePolling,
            interval: (_b = config.watchConfig) === null || _b === void 0 ? void 0 : _b.interval,
            depth: 99,
            awaitWriteFinish: true,
            ignorePermissionErrors: false,
            atomic: true,
            ignored,
        });
        debugLog(`[Watcher] Started`);
        const shutdown = () => {
            isShutdown = true;
            debugLog(`[Watcher] Shutting down`);
            log(`Shutting down watch...`);
            watcher.close();
            lifecycleHooks(config.hooks).beforeDone();
        };
        // it doesn't matter what has changed, need to run whole process anyway
        watcher.on('all', async (eventName, path$1) => {
            lifecycleHooks(config.hooks).onWatchTriggered(eventName, path$1);
            debugLog(`[Watcher] triggered due to a file ${eventName} event: ${path$1}`);
            const fullPath = path.join(process.cwd(), path$1);
            // In ESM require is not defined
            try {
                delete require.cache[fullPath];
            }
            catch (err) { }
            if (eventName === 'change' && config.configFilePath && fullPath === config.configFilePath) {
                log(`${logSymbols.info} Config file has changed, reloading...`);
                const context = await loadContext(config.configFilePath);
                const newParsedConfig = context.getConfig();
                newParsedConfig.watch = config.watch;
                newParsedConfig.silent = config.silent;
                newParsedConfig.overwrite = config.overwrite;
                newParsedConfig.configFilePath = config.configFilePath;
                config = newParsedConfig;
                initalContext.updateConfig(config);
            }
            debouncedExec();
        });
        process.once('SIGINT', shutdown);
        process.once('SIGTERM', shutdown);
    };
    // the promise never resolves to keep process running
    return new Promise((resolve, reject) => {
        executeCodegen(initalContext)
            .then(onNext, () => Promise.resolve())
            .then(runWatcher)
            .catch(err => {
            watcher.close();
            reject(err);
        });
    });
};

function writeSync(filepath, content) {
    return fs.writeFileSync(filepath, content);
}
function readSync(filepath) {
    return fs.readFileSync(filepath, 'utf-8');
}
function fileExists(filePath) {
    try {
        return fs.statSync(filePath).isFile();
    }
    catch (err) {
        return false;
    }
}
function unlinkFile(filePath, cb) {
    fs.unlink(filePath, cb);
}

const hash = (content) => crypto.createHash('sha1').update(content).digest('base64');
async function generate(input, saveToFile = true) {
    const context = ensureContext(input);
    const config = context.getConfig();
    await lifecycleHooks(config.hooks).afterStart();
    let previouslyGeneratedFilenames = [];
    function removeStaleFiles(config, generationResult) {
        const filenames = generationResult.map(o => o.filename);
        // find stale files from previous build which are not present in current build
        const staleFilenames = previouslyGeneratedFilenames.filter(f => !filenames.includes(f));
        staleFilenames.forEach(filename => {
            if (shouldOverwrite(config, filename)) {
                unlinkFile(filename, err => {
                    const prettyFilename = filename.replace(`${input.cwd || process.cwd()}/`, '');
                    if (err) {
                        debugLog(`Cannot remove stale file: ${prettyFilename}\n${err}`);
                    }
                    else {
                        debugLog(`Removed stale file: ${prettyFilename}`);
                    }
                });
            }
        });
        previouslyGeneratedFilenames = filenames;
    }
    const recentOutputHash = new Map();
    async function writeOutput(generationResult) {
        if (!saveToFile) {
            return generationResult;
        }
        if (config.watch) {
            removeStaleFiles(config, generationResult);
        }
        await lifecycleHooks(config.hooks).beforeAllFileWrite(generationResult.map(r => r.filename));
        await Promise.all(generationResult.map(async (result) => {
            const exists = fileExists(result.filename);
            if (!shouldOverwrite(config, result.filename) && exists) {
                return;
            }
            const content = result.content || '';
            const currentHash = hash(content);
            let previousHash = recentOutputHash.get(result.filename);
            if (!previousHash && exists) {
                previousHash = hash(readSync(result.filename));
            }
            if (previousHash && currentHash === previousHash) {
                debugLog(`Skipping file (${result.filename}) writing due to indentical hash...`);
                return;
            }
            if (content.length === 0) {
                return;
            }
            recentOutputHash.set(result.filename, currentHash);
            const basedir = path.dirname(result.filename);
            await lifecycleHooks(result.hooks).beforeOneFileWrite(result.filename);
            await lifecycleHooks(config.hooks).beforeOneFileWrite(result.filename);
            mkdirp.sync(basedir);
            const absolutePath = path.isAbsolute(result.filename)
                ? result.filename
                : path.join(input.cwd || process.cwd(), result.filename);
            writeSync(absolutePath, result.content);
            await lifecycleHooks(result.hooks).afterOneFileWrite(result.filename);
            await lifecycleHooks(config.hooks).afterOneFileWrite(result.filename);
        }));
        await lifecycleHooks(config.hooks).afterAllFileWrite(generationResult.map(r => r.filename));
        return generationResult;
    }
    // watch mode
    if (config.watch) {
        return createWatcher(context, writeOutput);
    }
    const outputFiles = await executeCodegen(context);
    await writeOutput(outputFiles);
    lifecycleHooks(config.hooks).beforeDone();
    return outputFiles;
}
function shouldOverwrite(config, outputPath) {
    const globalValue = config.overwrite === undefined ? true : !!config.overwrite;
    const outputConfig = config.generates[outputPath];
    if (!outputConfig) {
        debugLog(`Couldn't find a config of ${outputPath}`);
        return globalValue;
    }
    if (isConfiguredOutput(outputConfig) && typeof outputConfig.overwrite === 'boolean') {
        return outputConfig.overwrite;
    }
    return globalValue;
}
function isConfiguredOutput(output) {
    return typeof output.plugins !== 'undefined';
}

// Parses config and writes it to a file
async function writeConfig(answers, config) {
    const YAML = await new Promise(function (resolve) { resolve(_interopNamespace(require('json-to-pretty-yaml'))); }).then(m => ('default' in m ? m.default : m));
    const ext = answers.config.toLocaleLowerCase().endsWith('.json') ? 'json' : 'yml';
    const content = ext === 'json' ? JSON.stringify(config) : YAML.stringify(config);
    const fullPath = path.resolve(process.cwd(), answers.config);
    const relativePath = path.relative(process.cwd(), answers.config);
    fs.writeFileSync(fullPath, content, {
        encoding: 'utf-8',
    });
    return {
        relativePath,
        fullPath,
    };
}
// Updates package.json (script and plugins as dependencies)
async function writePackage(answers, configLocation) {
    // script
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkgContent = fs.readFileSync(pkgPath, {
        encoding: 'utf-8',
    });
    const pkg = JSON.parse(pkgContent);
    const { indent } = detectIndent(pkgContent);
    if (!pkg.scripts) {
        pkg.scripts = {};
    }
    pkg.scripts[answers.script] = `graphql-codegen --config ${configLocation}`;
    // plugin
    if (!pkg.devDependencies) {
        pkg.devDependencies = {};
    }
    await Promise.all(answers.plugins.map(async (plugin) => {
        pkg.devDependencies[plugin.package] = await getLatestVersion(plugin.package);
    }));
    if (answers.introspection) {
        pkg.devDependencies['@graphql-codegen/introspection'] = await getLatestVersion('@graphql-codegen/introspection');
    }
    pkg.devDependencies['@graphql-codegen/cli'] = await getLatestVersion('@graphql-codegen/cli');
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, indent));
}
function bold(str) {
    return chalk.bold(str);
}
function grey(str) {
    return chalk.grey(str);
}
function italic(str) {
    return chalk.italic(str);
}

var Tags;
(function (Tags) {
    Tags["browser"] = "Browser";
    Tags["node"] = "Node";
    Tags["typescript"] = "TypeScript";
    Tags["flow"] = "Flow";
    Tags["angular"] = "Angular";
    Tags["stencil"] = "Stencil";
    Tags["react"] = "React";
    Tags["vue"] = "Vue";
})(Tags || (Tags = {}));

const plugins = [
    {
        name: `TypeScript ${italic('(required by other typescript plugins)')}`,
        package: '@graphql-codegen/typescript',
        value: 'typescript',
        pathInRepo: 'typescript/typescript',
        available: hasTag(Tags.typescript),
        shouldBeSelected: tags => oneOf(tags, Tags.angular, Tags.stencil) || allOf(tags, Tags.typescript, Tags.react) || noneOf(tags, Tags.flow),
        defaultExtension: '.ts',
    },
    {
        name: `TypeScript Operations ${italic('(operations and fragments)')}`,
        package: '@graphql-codegen/typescript-operations',
        value: 'typescript-operations',
        pathInRepo: 'typescript/operations',
        available: tags => allOf(tags, Tags.browser, Tags.typescript),
        shouldBeSelected: tags => oneOf(tags, Tags.angular, Tags.stencil) || allOf(tags, Tags.typescript, Tags.react),
        defaultExtension: '.ts',
    },
    {
        name: `TypeScript Resolvers ${italic('(strongly typed resolve functions)')}`,
        package: '@graphql-codegen/typescript-resolvers',
        value: 'typescript-resolvers',
        pathInRepo: 'typescript/resolvers',
        available: tags => allOf(tags, Tags.node, Tags.typescript),
        shouldBeSelected: tags => noneOf(tags, Tags.flow),
        defaultExtension: '.ts',
    },
    {
        name: `Flow ${italic('(required by other flow plugins)')}`,
        package: '@graphql-codegen/flow',
        value: 'flow',
        pathInRepo: 'flow/flow',
        available: hasTag(Tags.flow),
        shouldBeSelected: tags => noneOf(tags, Tags.typescript),
        defaultExtension: '.js',
    },
    {
        name: `Flow Operations ${italic('(operations and fragments)')}`,
        package: '@graphql-codegen/flow-operations',
        value: 'flow-operations',
        pathInRepo: 'flow/operations',
        available: tags => allOf(tags, Tags.browser, Tags.flow),
        shouldBeSelected: tags => noneOf(tags, Tags.typescript),
        defaultExtension: '.js',
    },
    {
        name: `Flow Resolvers ${italic('(strongly typed resolve functions)')}`,
        package: '@graphql-codegen/flow-resolvers',
        value: 'flow-resolvers',
        pathInRepo: 'flow/resolvers',
        available: tags => allOf(tags, Tags.node, Tags.flow),
        shouldBeSelected: tags => noneOf(tags, Tags.typescript),
        defaultExtension: '.js',
    },
    {
        name: `TypeScript Apollo Angular ${italic('(typed GQL services)')}`,
        package: '@graphql-codegen/typescript-apollo-angular',
        value: 'typescript-apollo-angular',
        pathInRepo: 'typescript/apollo-angular',
        available: hasTag(Tags.angular),
        shouldBeSelected: () => true,
        defaultExtension: '.js',
    },
    {
        name: `TypeScript Vue Apollo Composition API ${italic('(typed functions)')}`,
        package: '@graphql-codegen/typescript-vue-apollo',
        value: 'typescript-vue-apollo',
        pathInRepo: 'typescript/vue-apollo',
        available: tags => allOf(tags, Tags.vue, Tags.typescript),
        shouldBeSelected: () => true,
        defaultExtension: '.ts',
    },
    {
        name: `TypeScript Vue Apollo Smart Operations ${italic('(typed functions)')}`,
        package: '@graphql-codegen/typescript-vue-apollo-smart-ops',
        value: 'typescript-vue-apollo-smart-ops',
        pathInRepo: 'typescript/vue-apollo-smart-ops',
        available: tags => allOf(tags, Tags.vue, Tags.typescript),
        shouldBeSelected: () => true,
        defaultExtension: '.ts',
    },
    {
        name: `TypeScript React Apollo ${italic('(typed components and HOCs)')}`,
        package: '@graphql-codegen/typescript-react-apollo',
        value: 'typescript-react-apollo',
        pathInRepo: 'typescript/react-apollo',
        available: tags => allOf(tags, Tags.react, Tags.typescript),
        shouldBeSelected: () => true,
        defaultExtension: '.tsx',
    },
    {
        name: `TypeScript Stencil Apollo ${italic('(typed components)')}`,
        package: '@graphql-codegen/typescript-stencil-apollo',
        value: 'typescript-stencil-apollo',
        pathInRepo: 'typescript/stencil-apollo',
        available: hasTag(Tags.stencil),
        shouldBeSelected: () => true,
        defaultExtension: '.tsx',
    },
    {
        name: `TypeScript MongoDB ${italic('(typed MongoDB objects)')}`,
        package: '@graphql-codegen/typescript-mongodb',
        value: 'typescript-mongodb',
        pathInRepo: 'typescript/mongodb',
        available: tags => allOf(tags, Tags.node, Tags.typescript),
        shouldBeSelected: () => false,
        defaultExtension: '.ts',
    },
    {
        name: `TypeScript GraphQL files modules ${italic('(declarations for .graphql files)')}`,
        package: '@graphql-codegen/typescript-graphql-files-modules',
        value: 'typescript-graphql-files-modules',
        pathInRepo: 'typescript/graphql-files-modules',
        available: tags => allOf(tags, Tags.browser, Tags.typescript),
        shouldBeSelected: () => false,
        defaultExtension: '.ts',
    },
    {
        name: `TypeScript GraphQL document nodes ${italic('(embedded GraphQL document)')}`,
        package: '@graphql-codegen/typescript-document-nodes',
        value: 'typescript-document-nodes',
        pathInRepo: 'typescript/document-nodes',
        available: tags => allOf(tags, Tags.typescript),
        shouldBeSelected: () => false,
        defaultExtension: '.ts',
    },
    {
        name: `Introspection Fragment Matcher ${italic('(for Apollo Client)')}`,
        package: '@graphql-codegen/fragment-matcher',
        value: 'fragment-matcher',
        pathInRepo: 'other/fragment-matcher',
        available: hasTag(Tags.browser),
        shouldBeSelected: () => false,
        defaultExtension: '.ts',
    },
    {
        name: `Urql Introspection ${italic('(for Urql Client)')}`,
        package: '@graphql-codegen/urql-introspection',
        value: 'urql-introspection',
        pathInRepo: 'other/urql-introspection',
        available: hasTag(Tags.browser),
        shouldBeSelected: () => false,
        defaultExtension: '.ts',
    },
];
function hasTag(tag) {
    return (tags) => tags.includes(tag);
}
function oneOf(list, ...items) {
    return list.some(i => items.includes(i));
}
function noneOf(list, ...items) {
    return !list.some(i => items.includes(i));
}
function allOf(list, ...items) {
    return items.every(i => list.includes(i));
}

function getQuestions(possibleTargets) {
    return [
        {
            type: 'checkbox',
            name: 'targets',
            message: `What type of application are you building?`,
            choices: getApplicationTypeChoices(possibleTargets),
            validate: ((targets) => targets.length > 0),
        },
        {
            type: 'input',
            name: 'schema',
            message: 'Where is your schema?:',
            suffix: grey(' (path or url)'),
            default: 'http://localhost:4000',
            validate: (str) => str.length > 0,
        },
        {
            type: 'input',
            name: 'documents',
            message: 'Where are your operations and fragments?:',
            when: answers => {
                // flatten targets
                // I can't find an API in Inquirer that would do that
                answers.targets = normalizeTargets(answers.targets);
                return answers.targets.includes(Tags.browser);
            },
            default: 'src/**/*.graphql',
            validate: (str) => str.length > 0,
        },
        {
            type: 'checkbox',
            name: 'plugins',
            message: 'Pick plugins:',
            choices: getPluginChoices,
            validate: ((plugins) => plugins.length > 0),
        },
        {
            type: 'input',
            name: 'output',
            message: 'Where to write the output:',
            default: getOutputDefaultValue,
            validate: (str) => str.length > 0,
        },
        {
            type: 'confirm',
            name: 'introspection',
            message: 'Do you want to generate an introspection file?',
        },
        {
            type: 'input',
            name: 'config',
            message: 'How to name the config file?',
            default: 'codegen.yml',
            validate: (str) => {
                const isNotEmpty = str.length > 0;
                const hasCorrectExtension = ['json', 'yml', 'yaml'].some(ext => str.toLocaleLowerCase().endsWith(`.${ext}`));
                return isNotEmpty && hasCorrectExtension;
            },
        },
        {
            type: 'input',
            name: 'script',
            message: 'What script in package.json should run the codegen?',
            validate: (str) => str.length > 0,
        },
    ];
}
function getApplicationTypeChoices(possibleTargets) {
    function withFlowOrTypescript(tags) {
        if (possibleTargets.TypeScript) {
            tags.push(Tags.typescript);
        }
        else if (possibleTargets.Flow) {
            tags.push(Tags.flow);
        }
        else {
            tags.push(Tags.flow, Tags.typescript);
        }
        return tags;
    }
    return [
        {
            name: 'Backend - API or server',
            key: 'backend',
            value: withFlowOrTypescript([Tags.node]),
            checked: possibleTargets.Node,
        },
        {
            name: 'Application built with Angular',
            key: 'angular',
            value: [Tags.angular, Tags.browser, Tags.typescript],
            checked: possibleTargets.Angular,
        },
        {
            name: 'Application built with React',
            key: 'react',
            value: withFlowOrTypescript([Tags.react, Tags.browser]),
            checked: possibleTargets.React,
        },
        {
            name: 'Application built with Stencil',
            key: 'stencil',
            value: [Tags.stencil, Tags.browser, Tags.typescript],
            checked: possibleTargets.Stencil,
        },
        {
            name: 'Application built with other framework or vanilla JS',
            key: 'client',
            value: [Tags.browser, Tags.typescript, Tags.flow],
            checked: possibleTargets.Browser && !possibleTargets.Angular && !possibleTargets.React && !possibleTargets.Stencil,
        },
    ];
}
function getPluginChoices(answers) {
    return plugins
        .filter(p => p.available(answers.targets))
        .map(p => {
        return {
            name: p.name,
            value: p,
            checked: p.shouldBeSelected(answers.targets),
        };
    });
}
function normalizeTargets(targets) {
    return [].concat(...targets);
}
function getOutputDefaultValue(answers) {
    if (answers.plugins.some(plugin => plugin.defaultExtension === '.tsx')) {
        return 'src/generated/graphql.tsx';
    }
    else if (answers.plugins.some(plugin => plugin.defaultExtension === '.ts')) {
        return 'src/generated/graphql.ts';
    }
    else {
        return 'src/generated/graphql.js';
    }
}

async function guessTargets() {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), {
        encoding: 'utf-8',
    }));
    const dependencies = Object.keys({
        ...pkg.dependencies,
        ...pkg.devDependencies,
    });
    return {
        [Tags.angular]: isAngular(dependencies),
        [Tags.react]: isReact(dependencies),
        [Tags.stencil]: isStencil(dependencies),
        [Tags.vue]: isVue(dependencies),
        [Tags.browser]: false,
        [Tags.node]: false,
        [Tags.typescript]: isTypescript(dependencies),
        [Tags.flow]: isFlow(dependencies),
    };
}
function isAngular(dependencies) {
    return dependencies.includes('@angular/core');
}
function isReact(dependencies) {
    return dependencies.includes('react');
}
function isStencil(dependencies) {
    return dependencies.includes('@stencil/core');
}
function isVue(dependencies) {
    return dependencies.includes('vue') || dependencies.includes('nuxt');
}
function isTypescript(dependencies) {
    return dependencies.includes('typescript');
}
function isFlow(dependencies) {
    return dependencies.includes('flow');
}

function log$1(...msgs) {
    // eslint-disable-next-line no-console
    console.log(...msgs);
}
async function init() {
    log$1(`
    Welcome to ${bold('GraphQL Code Generator')}!
    Answer few questions and we will setup everything for you.
  `);
    const possibleTargets = await guessTargets();
    const answers = await inquirer.prompt(getQuestions(possibleTargets));
    // define config
    const config = {
        overwrite: true,
        schema: answers.schema,
        documents: answers.targets.includes(Tags.browser) ? answers.documents : null,
        generates: {
            [answers.output]: {
                plugins: answers.plugins.map(p => p.value),
            },
        },
    };
    // introspection
    if (answers.introspection) {
        addIntrospection(config);
    }
    // config file
    const { relativePath } = await writeConfig(answers, config);
    log$1(`Fetching latest versions of selected plugins...`);
    // write package.json
    await writePackage(answers, relativePath);
    // Emit status to the terminal
    log$1(`
    Config file generated at ${bold(relativePath)}
    
      ${bold('$ npm install')}

    To install the plugins.

      ${bold(`$ npm run ${answers.script}`)}

    To run GraphQL Code Generator.
  `);
}
// adds an introspection to `generates`
function addIntrospection(config) {
    config.generates['./graphql.schema.json'] = {
        plugins: ['introspection'],
    };
}

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

function cliError(err, exitOnError = true) {
    let msg;
    if (err instanceof Error) {
        msg = err.message || err.toString();
    }
    else if (typeof err === 'string') {
        msg = err;
    }
    else {
        msg = JSON.stringify(err);
    }
    // eslint-disable-next-line no-console
    console.error(msg);
    if (exitOnError && isNode) {
        process.exit(1);
    }
    else if (exitOnError && isBrowser) {
        throw err;
    }
}

async function runCli(cmd) {
    await ensureGraphQlPackage();
    switch (cmd) {
        case 'init':
            return init();
        default: {
            return createContext().then(context => {
                return generate(context).catch(async (error) => {
                    await lifecycleHooks(context.getConfig().hooks).onError(error.toString());
                    throw error;
                });
            });
        }
    }
}
async function ensureGraphQlPackage() {
    try {
        await new Promise(function (resolve) { resolve(_interopNamespace(require('graphql'))); });
    }
    catch (e) {
        throw new pluginHelpers.DetailedError(`Unable to load "graphql" package. Please make sure to install "graphql" as a dependency!`, `
  To install "graphql", run:
    yarn add graphql
  Or, with NPM:
    npm install --save graphql
`);
    }
}

exports.CodegenContext = CodegenContext;
exports.CodegenExtension = CodegenExtension;
exports.buildOptions = buildOptions;
exports.cliError = cliError;
exports.createContext = createContext;
exports.ensureContext = ensureContext;
exports.ensureGraphQlPackage = ensureGraphQlPackage;
exports.executeCodegen = executeCodegen;
exports.findAndLoadGraphQLConfig = findAndLoadGraphQLConfig;
exports.generate = generate;
exports.init = init;
exports.loadContext = loadContext;
exports.parseArgv = parseArgv;
exports.runCli = runCli;
exports.updateContextWithCliFlags = updateContextWithCliFlags;
