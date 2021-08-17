import { PluginFunction } from '@graphql-codegen/plugin-helpers';
import { FragmentDefinitionNode, OperationDefinitionNode } from 'graphql';
import { Source } from '@graphql-tools/utils';

export type OperationOrFragment = {
  initialName: string;
  definition: OperationDefinitionNode | FragmentDefinitionNode;
};

export type SourceWithOperations = {
  source: Source;
  operations: Array<OperationOrFragment>;
};

const documentTypePartial = `
export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<
  infer TType,
  any
>
  ? TType
  : never;
`.split(`\n`);

export const plugin: PluginFunction<{
  sourcesWithOperations: Array<SourceWithOperations>;
  augmentedModuleName?: string;
}> = (_, __, config) => {
  if (!config.sourcesWithOperations) {
    return '';
  }

  if (config.augmentedModuleName == null) {
    return [
      `import * as graphql from './graphql';\n`,
      `import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';\n`,
      `\n`,
      ...getDocumentRegistryChunk(config.sourcesWithOperations),
      `\n`,
      ...getGqlOverloadChunk(config.sourcesWithOperations, 'lookup'),
      `\n`,
      `export function gql(source: string): unknown;\n`,
      `export function gql(source: string) {\n`,
      `  return (documents as any)[source] ?? {};\n`,
      `}\n`,
      `\n`,
      ...documentTypePartial,
    ].join(``);
  }

  return [
    `import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';\n`,
    `declare module "${config.augmentedModuleName}" {`,
    [
      `\n`,
      ...getGqlOverloadChunk(config.sourcesWithOperations, 'augmented'),
      `export function gql(source: string): unknown;\n`,
      `\n`,
      ...documentTypePartial,
    ]
      .map(line => (line === `\n` ? line : `  ${line}`))
      .join(``),
    `}`,
  ].join(`\n`);
};

function getDocumentRegistryChunk(sourcesWithOperations: Array<SourceWithOperations> = []) {
  const lines: Array<string> = [];
  lines.push(`const documents = {\n`);

  for (const { operations, ...rest } of sourcesWithOperations) {
    const originalString = rest.source.rawSDL!;
    const operation = operations[0];

    lines.push(`    ${JSON.stringify(originalString)}: graphql.${operation.initialName},\n`);
  }

  lines.push(`};\n`);

  return lines;
}

type Mode = 'lookup' | 'augmented';

function getGqlOverloadChunk(sourcesWithOperations: Array<SourceWithOperations>, mode: Mode) {
  const lines: Array<string> = [];

  // We intentionally don't use a <T extends keyof typeof documents> generic, because TS
  // would print very long `gql` function signatures (duplicating the source).
  for (const { operations, ...rest } of sourcesWithOperations) {
    const originalString = rest.source.rawSDL!;
    const returnType =
      mode === 'lookup'
        ? `(typeof documents)[${JSON.stringify(originalString)}]`
        : `typeof import('./graphql').${operations[0].initialName}`;
    lines.push(`export function gql(source: ${JSON.stringify(originalString)}): ${returnType};\n`);
  }

  return lines;
}
