import { PluginFunction } from '@graphql-codegen/plugin-helpers';
import { FragmentDefinitionNode, OperationDefinitionNode } from 'graphql';
import { Source } from '@graphql-tools/utils';
export declare type OperationOrFragment = {
  initialName: string;
  definition: OperationDefinitionNode | FragmentDefinitionNode;
};
export declare type SourceWithOperations = {
  source: Source;
  operations: Array<OperationOrFragment>;
};
export declare const plugin: PluginFunction<{
  sourcesWithOperations: Array<SourceWithOperations>;
}>;
