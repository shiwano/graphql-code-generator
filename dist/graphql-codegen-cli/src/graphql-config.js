import { loadConfig } from 'graphql-config';
import { ApolloEngineLoader } from '@graphql-tools/apollo-engine-loader';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GitLoader } from '@graphql-tools/git-loader';
import { GithubLoader } from '@graphql-tools/github-loader';
import { PrismaLoader } from '@graphql-tools/prisma-loader';
export const CodegenExtension = (api) => {
    // Schema
    api.loaders.schema.register(new CodeFileLoader({
        pluckConfig: {
            skipIndent: true,
        },
    }));
    api.loaders.schema.register(new GitLoader());
    api.loaders.schema.register(new GithubLoader());
    api.loaders.schema.register(new ApolloEngineLoader());
    api.loaders.schema.register(new PrismaLoader());
    // Documents
    api.loaders.documents.register(new CodeFileLoader({
        pluckConfig: {
            skipIndent: true,
        },
    }));
    api.loaders.documents.register(new GitLoader());
    api.loaders.documents.register(new GithubLoader());
    return {
        name: 'codegen',
    };
};
export async function findAndLoadGraphQLConfig(filepath) {
    const config = await loadConfig({
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
//# sourceMappingURL=graphql-config.js.map