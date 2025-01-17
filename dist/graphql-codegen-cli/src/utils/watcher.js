import { executeCodegen } from '../codegen';
import { normalizeInstanceOrArray, normalizeOutputParam } from '@graphql-codegen/plugin-helpers';
import isGlob from 'is-glob';
import debounce from 'debounce';
import logSymbols from 'log-symbols';
import { debugLog } from './debugging';
import { getLogger } from './logger';
import { join } from 'path';
import { lifecycleHooks } from '../hooks';
import { loadContext } from '../config';
import { isValidPath } from '@graphql-tools/utils';
function log(msg) {
    // double spaces to inline the message with Listr
    getLogger().info(`  ${msg}`);
}
function emitWatching() {
    log(`${logSymbols.info} Watching for changes...`);
}
export const createWatcher = (initalContext, onNext) => {
    debugLog(`[Watcher] Starting watcher...`);
    let config = initalContext.getConfig();
    const files = [initalContext.filepath].filter(a => a);
    const documents = normalizeInstanceOrArray(config.documents);
    const schemas = normalizeInstanceOrArray(config.schema);
    // Add schemas and documents from "generates"
    Object.keys(config.generates)
        .map(filename => normalizeOutputParam(config.generates[filename]))
        .forEach(conf => {
        schemas.push(...normalizeInstanceOrArray(conf.schema));
        documents.push(...normalizeInstanceOrArray(conf.documents));
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
        if (isGlob(schema) || isValidPath(schema)) {
            files.push(schema);
        }
    });
    if (typeof config.watch !== 'boolean') {
        files.push(...normalizeInstanceOrArray(config.watch));
    }
    let watcher;
    const runWatcher = async () => {
        var _a, _b;
        const chokidar = await import('chokidar');
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
            .map(filename => ({ filename, config: normalizeOutputParam(config.generates[filename]) }))
            .forEach(entry => {
            if (entry.config.preset) {
                const extension = entry.config.presetConfig && entry.config.presetConfig.extension;
                if (extension) {
                    ignored.push(join(entry.filename, '**', '*' + extension));
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
        watcher.on('all', async (eventName, path) => {
            lifecycleHooks(config.hooks).onWatchTriggered(eventName, path);
            debugLog(`[Watcher] triggered due to a file ${eventName} event: ${path}`);
            const fullPath = join(process.cwd(), path);
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
//# sourceMappingURL=watcher.js.map