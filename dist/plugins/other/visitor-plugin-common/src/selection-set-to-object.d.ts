import {
  SelectionSetNode,
  FieldNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  GraphQLNamedType,
  GraphQLSchema,
  SelectionNode,
  GraphQLObjectType,
} from 'graphql';
import { NormalizedScalarsMap, ConvertNameFn, LoadedFragment, GetFragmentSuffixFn } from './types';
import { BaseVisitorConvertOptions } from './base-visitor';
import { ParsedDocumentsConfig } from './base-documents-visitor';
import {
  LinkField,
  PrimitiveAliasedFields,
  PrimitiveField,
  BaseSelectionSetProcessor,
} from './selection-set-processor/base';
declare type FragmentSpreadUsage = {
  fragmentName: string;
  typeName: string;
  onType: string;
  selectionNodes: Array<SelectionNode>;
};
export declare class SelectionSetToObject<Config extends ParsedDocumentsConfig = ParsedDocumentsConfig> {
  protected _processor: BaseSelectionSetProcessor<any>;
  protected _scalars: NormalizedScalarsMap;
  protected _schema: GraphQLSchema;
  protected _convertName: ConvertNameFn<BaseVisitorConvertOptions>;
  protected _getFragmentSuffix: GetFragmentSuffixFn;
  protected _loadedFragments: LoadedFragment[];
  protected _config: Config;
  protected _parentSchemaType?: GraphQLNamedType;
  protected _selectionSet?: SelectionSetNode;
  protected _primitiveFields: PrimitiveField[];
  protected _primitiveAliasedFields: PrimitiveAliasedFields[];
  protected _linksFields: LinkField[];
  protected _queriedForTypename: boolean;
  constructor(
    _processor: BaseSelectionSetProcessor<any>,
    _scalars: NormalizedScalarsMap,
    _schema: GraphQLSchema,
    _convertName: ConvertNameFn<BaseVisitorConvertOptions>,
    _getFragmentSuffix: GetFragmentSuffixFn,
    _loadedFragments: LoadedFragment[],
    _config: Config,
    _parentSchemaType?: GraphQLNamedType,
    _selectionSet?: SelectionSetNode
  );
  createNext(parentSchemaType: GraphQLNamedType, selectionSet: SelectionSetNode): SelectionSetToObject;
  /**
   * traverse the inline fragment nodes recursively for collecting the selectionSets on each type
   */
  _collectInlineFragments(
    parentType: GraphQLNamedType,
    nodes: InlineFragmentNode[],
    types: Map<string, Array<SelectionNode | FragmentSpreadUsage>>
  ): any;
  protected _createInlineFragmentForFieldNodes(
    parentType: GraphQLNamedType,
    fieldNodes: FieldNode[]
  ): InlineFragmentNode;
  protected buildFragmentSpreadsUsage(spreads: FragmentSpreadNode[]): Record<string, FragmentSpreadUsage[]>;
  protected flattenSelectionSet(
    selections: ReadonlyArray<SelectionNode>
  ): Map<string, Array<SelectionNode | FragmentSpreadUsage>>;
  private _appendToTypeMap;
  /**
   * mustAddEmptyObject indicates that not all possible types on a union or interface field are covered.
   */
  protected _buildGroupedSelections(): {
    grouped: Record<string, string[]>;
    mustAddEmptyObject: boolean;
  };
  protected buildSelectionSetString(
    parentSchemaType: GraphQLObjectType,
    selectionNodes: Array<SelectionNode | FragmentSpreadUsage>
  ): string;
  protected isRootType(type: GraphQLObjectType): boolean;
  protected buildTypeNameField(
    type: GraphQLObjectType,
    nonOptionalTypename?: boolean,
    addTypename?: boolean,
    queriedForTypename?: boolean,
    skipTypeNameForRoot?: boolean
  ): {
    name: string;
    type: string;
  };
  protected getUnknownType(): string;
  protected getEmptyObjectType(): string;
  private getEmptyObjectTypeString;
  transformSelectionSet(): string;
  transformFragmentSelectionSetToTypes(
    fragmentName: string,
    fragmentSuffix: string,
    declarationBlockConfig: any
  ): string;
  protected buildFragmentTypeName(name: string, suffix: string, typeName?: string): string;
}
export {};
