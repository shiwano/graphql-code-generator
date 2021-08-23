import { Types, PluginValidateFn, PluginFunction } from '@graphql-codegen/plugin-helpers';
import { UrqlVisitor } from './visitor';
import { VueUrqlRawPluginConfig } from './config';
export declare const plugin: PluginFunction<VueUrqlRawPluginConfig, Types.ComplexPluginOutput>;
export declare const validate: PluginValidateFn<any>;
export { UrqlVisitor };
