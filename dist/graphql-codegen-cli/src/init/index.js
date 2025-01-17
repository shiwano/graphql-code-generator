import inquirer from 'inquirer';
import { getQuestions } from './questions';
import { guessTargets } from './targets';
import { Tags } from './types';
import { writeConfig, writePackage, bold } from './helpers';
function log(...msgs) {
    // eslint-disable-next-line no-console
    console.log(...msgs);
}
export async function init() {
    log(`
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
    log(`Fetching latest versions of selected plugins...`);
    // write package.json
    await writePackage(answers, relativePath);
    // Emit status to the terminal
    log(`
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
//# sourceMappingURL=index.js.map