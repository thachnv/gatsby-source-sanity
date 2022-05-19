import { Actions, NodePluginArgs } from 'gatsby';
import { SanityDocument } from '../types/sanity';
import { TypeMap } from './remoteGraphQLSchema';
import { SanityInputNode } from '../types/gatsby';
import { SanityClient } from '@sanity/client';
export declare const RESTRICTED_NODE_FIELDS: string[];
export interface ProcessingOptions {
    typeMap: TypeMap;
    createNode: Actions['createNode'];
    createNodeId: NodePluginArgs['createNodeId'];
    createContentDigest: NodePluginArgs['createContentDigest'];
    createParentChildLink: Actions['createParentChildLink'];
    overlayDrafts: boolean;
    client: SanityClient;
}
export declare function toGatsbyNode(doc: SanityDocument, options: ProcessingOptions): SanityInputNode;
export declare function getTypeName(type: string): string;
export declare function getConflictFreeFieldName(fieldName: string): string;
