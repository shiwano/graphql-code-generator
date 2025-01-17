import { debugLog } from './utils/debugging';
import { exec } from 'child_process';
import { delimiter, sep } from 'path';
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
        exec(cmd, {
            env: {
                ...process.env,
                PATH: `${process.env.PATH}${delimiter}${process.cwd()}${sep}node_modules${sep}.bin`,
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
export const lifecycleHooks = (_hooks = {}) => {
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
//# sourceMappingURL=hooks.js.map