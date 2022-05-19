"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var debug_1 = __importDefault(require("../debug"));
// import createNodeManifest from './createNodeManifest'
var documentIds_1 = require("./documentIds");
var normalize_1 = require("./normalize");
/**
 * @returns function to sync a single document from the local cache of known documents with Gatsby
 */
function getSyncWithGatsby(props) {
    var documents = props.documents, gatsbyNodes = props.gatsbyNodes, processingOptions = props.processingOptions, args = props.args;
    var typeMap = processingOptions.typeMap, overlayDrafts = processingOptions.overlayDrafts;
    var reporter = args.reporter, actions = args.actions;
    var createNode = actions.createNode, deleteNode = actions.deleteNode;
    return function (id, updatedDocument) {
        var publishedId = (0, documentIds_1.unprefixId)(id);
        var draftId = (0, documentIds_1.prefixId)(id);
        // `handleDeltaChanges` uses updatedDocument to avoid having to be responsible for updating `documents`
        if (updatedDocument) {
            documents.set(id, updatedDocument);
        }
        var published = documents.get(publishedId);
        var draft = documents.get(draftId);
        var doc = draft || published;
        if (doc) {
            var type = (0, normalize_1.getTypeName)(doc._type);
            if (!typeMap.objects[type]) {
                reporter.warn("[sanity] Document \"".concat(doc._id, "\" has type ").concat(doc._type, " (").concat(type, "), which is not declared in the GraphQL schema. Make sure you run \"graphql deploy\". Skipping document."));
                return;
            }
        }
        if (id === draftId && !overlayDrafts) {
            // do nothing, we're not overlaying drafts
            (0, debug_1.default)('overlayDrafts is not enabled, so skipping createNode for draft');
            return;
        }
        if (id === publishedId) {
            if (draft && overlayDrafts) {
                // we have a draft, and overlayDrafts is enabled, so skip to the draft document instead
                (0, debug_1.default)('skipping createNode of %s since there is a draft and overlayDrafts is enabled', publishedId);
                return;
            }
            if (gatsbyNodes.has(publishedId)) {
                // sync existing gatsby node with document from updated cache
                if (published) {
                    (0, debug_1.default)('updating gatsby node for %s', publishedId);
                    var node = (0, normalize_1.toGatsbyNode)(published, processingOptions);
                    gatsbyNodes.set(publishedId, node);
                    createNode(node);
                    // createNodeManifest(actions, args, node, publishedId)
                }
                else {
                    // the published document has been removed (note - we either have no draft or overlayDrafts is not enabled so merely removing is ok here)
                    (0, debug_1.default)('deleting gatsby node for %s since there is no draft and overlayDrafts is not enabled', publishedId);
                    deleteNode(gatsbyNodes.get(publishedId));
                    gatsbyNodes.delete(publishedId);
                }
            }
            else if (published) {
                // when we don't have a gatsby node for the published document
                (0, debug_1.default)('creating gatsby node for %s', publishedId);
                var node = (0, normalize_1.toGatsbyNode)(published, processingOptions);
                gatsbyNodes.set(publishedId, node);
                createNode(node);
                // createNodeManifest(actions, args, node, publishedId)
            }
        }
        if (id === draftId && overlayDrafts) {
            // we're syncing a draft version and overlayDrafts is enabled
            if (gatsbyNodes.has(publishedId) && !draft && !published) {
                // have stale gatsby node for a published document that has neither a draft or a published (e.g. it's been deleted)
                (0, debug_1.default)('deleting gatsby node for %s since there is neither a draft nor a published version of it any more', publishedId);
                deleteNode(gatsbyNodes.get(publishedId));
                gatsbyNodes.delete(publishedId);
                return;
            }
            (0, debug_1.default)('Replacing gatsby node for %s using the %s document', publishedId, draft ? 'draft' : 'published');
            // pick the draft if we can, otherwise pick the published
            var node = (0, normalize_1.toGatsbyNode)((draft || published), processingOptions);
            gatsbyNodes.set(publishedId, node);
            createNode(node);
            // createNodeManifest(actions, args, node, publishedId)
        }
    };
}
exports.default = getSyncWithGatsby;
//# sourceMappingURL=getSyncWithGatsby.js.map