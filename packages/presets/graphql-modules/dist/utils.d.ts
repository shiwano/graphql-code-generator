import { DocumentNode, NamedTypeNode, TypeNode } from 'graphql';
import { Source } from '@graphql-tools/utils';
/**
 * Searches every node to collect used types
 */
export declare function collectUsedTypes(doc: DocumentNode): string[];
export declare function resolveTypeNode(node: TypeNode): NamedTypeNode;
export declare function isGraphQLPrimitive(name: string): boolean;
export declare function unique<T>(val: T, i: number, all: T[]): boolean;
export declare function withQuotes(val: string): string;
export declare function indent(size: number): (val: string) => string;
export declare function buildBlock({ name, lines }: { name: string; lines: string[] }): string;
export declare function groupSourcesByModule(sources: Source[], basePath: string): Record<string, Source[]>;
export declare function stripFilename(path: string): string;
export declare function normalize(path: string): string;
/**
 * Pushes an item to a list only if the list doesn't include the item
 */
export declare function pushUnique<T extends any>(list: T[], item: T): void;
export declare function concatByKey<T extends Record<string, any[]>, K extends keyof T>(
  left: T,
  right: T,
  key: K
): any[];
export declare function uniqueByKey<T extends Record<string, any[]>, K extends keyof T>(
  left: T,
  right: T,
  key: K
): any[];
export declare function createObject<K extends string, T>(keys: K[], valueFn: (key: K) => T): Record<K, T>;
