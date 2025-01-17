import { DocumentNode, FragmentDefinitionNode } from 'graphql';
import { FragmentRegistry } from './fragment-resolver';
export declare function defineFilepathSubfolder(baseFilePath: string, folder: string): string;
export declare function appendExtensionToFilePath(baseFilePath: string, extension: string): string;
export declare function extractExternalFragmentsInUse(
  documentNode: DocumentNode | FragmentDefinitionNode,
  fragmentNameToFile: FragmentRegistry,
  result?: {
    [fragmentName: string]: number;
  },
  level?: number
): {
  [fragmentName: string]: number;
};
