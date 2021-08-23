import { Types, PluginValidateFn, PluginFunction } from '@graphql-codegen/plugin-helpers';
import { VueApolloVisitor } from './visitor';
import { VueApolloSmartOpsRawPluginConfig } from './config';
export declare const plugin: PluginFunction<VueApolloSmartOpsRawPluginConfig, Types.ComplexPluginOutput>;
export declare const validate: PluginValidateFn<any>;
export { VueApolloVisitor };
