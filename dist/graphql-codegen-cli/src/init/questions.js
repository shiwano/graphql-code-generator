import { grey } from './helpers';
import { Tags } from './types';
import { plugins } from './plugins';
export function getQuestions(possibleTargets) {
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
export function getApplicationTypeChoices(possibleTargets) {
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
export function getPluginChoices(answers) {
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
export function getOutputDefaultValue(answers) {
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
//# sourceMappingURL=questions.js.map