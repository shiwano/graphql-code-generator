import { PluginFunction, PluginValidateFn } from '@graphql-codegen/plugin-helpers';
import { TypeScriptMongoPluginConfig } from './config';
export declare const plugin: PluginFunction<TypeScriptMongoPluginConfig>;
export declare const DIRECTIVES: import('graphql').DocumentNode;
export declare const addToSchema: import('graphql').DocumentNode;
export declare const validate: PluginValidateFn<any>;
