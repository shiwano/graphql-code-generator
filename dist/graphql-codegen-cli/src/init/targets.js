import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Tags } from './types';
export async function guessTargets() {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), {
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
//# sourceMappingURL=targets.js.map