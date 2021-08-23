import { DocumentNode, GraphQLSchema } from 'graphql';
import { ModulesConfig } from './config';
import { BaseVisitor } from '@graphql-codegen/visitor-plugin-common';
export declare function buildModule(
  name: string,
  doc: DocumentNode,
  {
    importNamespace,
    importPath,
    encapsulate,
    shouldDeclare,
    rootTypes,
    schema,
    baseVisitor,
  }: {
    importNamespace: string;
    importPath: string;
    encapsulate: ModulesConfig['encapsulateModuleTypes'];
    shouldDeclare: boolean;
    rootTypes: string[];
    baseVisitor: BaseVisitor;
    schema?: GraphQLSchema;
  }
): string;
