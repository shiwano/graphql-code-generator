import {
  LinkField,
  PrimitiveAliasedFields,
  SelectionSetProcessorConfig,
  ProcessResult,
  BaseSelectionSetProcessor,
  PrimitiveField,
} from '@graphql-codegen/visitor-plugin-common';
import { GraphQLObjectType, GraphQLInterfaceType } from 'graphql';
export interface FlowSelectionSetProcessorConfig extends SelectionSetProcessorConfig {
  useFlowExactObjects: boolean;
}
export declare class FlowWithPickSelectionSetProcessor extends BaseSelectionSetProcessor<FlowSelectionSetProcessorConfig> {
  transformAliasesPrimitiveFields(
    schemaType: GraphQLObjectType | GraphQLInterfaceType,
    fields: PrimitiveAliasedFields[]
  ): ProcessResult;
  buildFieldsIntoObject(allObjectsMerged: string[]): string;
  buildSelectionSetFromStrings(pieces: string[]): string;
  transformLinkFields(fields: LinkField[]): ProcessResult;
  transformPrimitiveFields(
    schemaType: GraphQLObjectType | GraphQLInterfaceType,
    fields: PrimitiveField[]
  ): ProcessResult;
  transformTypenameField(type: string, name: string): ProcessResult;
}
