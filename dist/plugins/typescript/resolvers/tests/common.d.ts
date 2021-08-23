import { Types } from '@graphql-codegen/plugin-helpers';
export declare const schema: import('graphql').GraphQLSchema;
export declare const validate: (
  content: Types.PluginOutput,
  config?: any,
  pluginSchema?: import('graphql').GraphQLSchema,
  additionalCode?: string
) => Promise<string>;
