'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

const pluginHelpers = require('@graphql-codegen/plugin-helpers');
const addPlugin = _interopDefault(require('@graphql-codegen/add'));

const preset = {
    buildGeneratesSection: options => {
        if (!options.presetConfig.typesPath) {
            throw new Error(`Preset "import-types" requires you to specify "typesPath" configuration and point it to your base types file (generated by "typescript" plugin)!`);
        }
        const importTypesNamespace = options.presetConfig.importTypesNamespace || 'Types';
        const pluginMap = {
            ...options.pluginMap,
            add: addPlugin,
        };
        const plugins = [...options.plugins];
        const config = {
            ...options.config,
            // This is for the operations plugin
            namespacedImportName: importTypesNamespace,
            // This is for the client-side runtime plugins
            importOperationTypesFrom: importTypesNamespace,
            externalFragments: [],
        };
        options.documents.map(documentFile => {
            if (pluginHelpers.isUsingTypes(documentFile.document, config.externalFragments.map(m => m.name), options.schemaAst)) {
                const importType = options.config.useTypeImports ? 'import type' : 'import';
                plugins.unshift({
                    add: {
                        content: `${importType} * as ${importTypesNamespace} from '${options.presetConfig.typesPath}';\n`,
                    },
                });
            }
        });
        return [
            {
                filename: options.baseOutputDir,
                plugins,
                pluginMap,
                config,
                schema: options.schema,
                schemaAst: options.schemaAst,
                documents: options.documents,
            },
        ];
    },
};

exports.default = preset;
exports.preset = preset;
