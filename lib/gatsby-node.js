"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCreateDevServer = exports.setFieldsOnGraphQLNodeType = exports.sourceNodes = exports.createSchemaCustomization = exports.createResolvers = exports.onPreBootstrap = exports.onPreInit = void 0;
const client_1 = __importDefault(require("@sanity/client"));
const polyfill_remote_file_1 = require("gatsby-plugin-utils/polyfill-remote-file");
const polyfill_remote_file_2 = require("gatsby-plugin-utils/polyfill-remote-file");
const package_json_1 = __importDefault(require("gatsby/package.json"));
const lodash_1 = require("lodash");
const oneline_1 = __importDefault(require("oneline"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const debug_1 = __importDefault(require("./debug"));
const extendImageNode_1 = require("./images/extendImageNode");
const cache_1 = require("./util/cache");
const documentIds_1 = require("./util/documentIds");
const downloadDocuments_1 = __importDefault(require("./util/downloadDocuments"));
const errors_1 = require("./util/errors");
const getGraphQLResolverMap_1 = require("./util/getGraphQLResolverMap");
const getPluginStatus_1 = require("./util/getPluginStatus");
const getSyncWithGatsby_1 = __importDefault(require("./util/getSyncWithGatsby"));
const handleDeltaChanges_1 = __importDefault(require("./util/handleDeltaChanges"));
const handleWebhookEvent_1 = require("./util/handleWebhookEvent");
const remoteGraphQLSchema_1 = require("./util/remoteGraphQLSchema");
const rewriteGraphQLSchema_1 = require("./util/rewriteGraphQLSchema");
const validateConfig_1 = __importDefault(require("./util/validateConfig"));
let coreSupportsOnPluginInit;
try {
    const { isGatsbyNodeLifecycleSupported } = require(`gatsby-plugin-utils`);
    if (isGatsbyNodeLifecycleSupported(`onPluginInit`)) {
        coreSupportsOnPluginInit = 'stable';
    }
    else if (isGatsbyNodeLifecycleSupported(`unstable_onPluginInit`)) {
        coreSupportsOnPluginInit = 'unstable';
    }
}
catch (e) {
    console.error(`Could not check if Gatsby supports onPluginInit lifecycle`);
}
const defaultConfig = {
    version: '1',
    overlayDrafts: false,
    graphqlTag: 'default',
    watchModeBuffer: 150,
};
const stateCache = {};
const initializePlugin = async ({ reporter }, pluginOptions) => {
    const config = Object.assign(Object.assign({}, defaultConfig), pluginOptions);
    if (Number(package_json_1.default.version.split('.')[0]) < 3) {
        const unsupportedVersionMessage = (0, oneline_1.default) `
    You are using a version of Gatsby not supported by gatsby-source-sanity.
    Upgrade gatsby to >= 3.0.0 to continue.`;
        reporter.panic({
            id: (0, errors_1.prefixId)(errors_1.ERROR_CODES.UnsupportedGatsbyVersion),
            context: { sourceMessage: unsupportedVersionMessage },
        });
        return;
    }
    // Actually throws in validation function, but helps typescript perform type narrowing
    if (!(0, validateConfig_1.default)(config, reporter)) {
        throw new Error('Invalid config');
    }
    try {
        reporter.info('[sanity] Fetching remote GraphQL schema');
        const client = getClient(config);
        const api = await (0, remoteGraphQLSchema_1.getRemoteGraphQLSchema)(client, config);
        reporter.info('[sanity] Transforming to Gatsby-compatible GraphQL SDL');
        const graphqlSdl = await (0, rewriteGraphQLSchema_1.rewriteGraphQLSchema)(api, { config, reporter });
        const graphqlSdlKey = (0, cache_1.getCacheKey)(config, cache_1.CACHE_KEYS.GRAPHQL_SDL);
        stateCache[graphqlSdlKey] = graphqlSdl;
        reporter.info('[sanity] Stitching GraphQL schemas from SDL');
        const typeMap = (0, remoteGraphQLSchema_1.getTypeMapFromGraphQLSchema)(api);
        const typeMapKey = (0, cache_1.getCacheKey)(config, cache_1.CACHE_KEYS.TYPE_MAP);
        stateCache[typeMapKey] = typeMap;
    }
    catch (err) {
        if (err.isWarning) {
            err.message.split('\n').forEach((line) => reporter.warn(line));
            return;
        }
        if (typeof err.code === 'string' && errors_1.SANITY_ERROR_CODE_MAP[err.code]) {
            reporter.panic({
                id: (0, documentIds_1.prefixId)(errors_1.SANITY_ERROR_CODE_MAP[err.code]),
                context: { sourceMessage: `[sanity] ${errors_1.SANITY_ERROR_CODE_MESSAGES[err.code]}` },
            });
        }
        const prefix = typeof err.code === 'string' ? `[${err.code}] ` : '';
        reporter.panic({
            id: (0, documentIds_1.prefixId)(errors_1.ERROR_CODES.SchemaFetchError),
            context: { sourceMessage: `${prefix}${err.message}` },
        });
    }
};
const onPreInit = async ({ reporter }) => {
    // onPluginInit replaces onPreInit in Gatsby V4
    // Old versions of Gatsby does not have the method setErrorMap
    if (!coreSupportsOnPluginInit && reporter.setErrorMap) {
        reporter.setErrorMap(errors_1.ERROR_MAP);
    }
};
exports.onPreInit = onPreInit;
const onPreBootstrap = async (args, pluginOptions) => {
    // Because we are setting global state here, this code now needs to run in onPluginInit if using Gatsby V4
    if (!coreSupportsOnPluginInit) {
        await initializePlugin(args, pluginOptions);
    }
};
exports.onPreBootstrap = onPreBootstrap;
const onPluginInit = async (args, pluginOptions) => {
    args.reporter.setErrorMap(errors_1.ERROR_MAP);
    await initializePlugin(args, pluginOptions);
};
if (coreSupportsOnPluginInit === 'stable') {
    // to properly initialize plugin in worker (`onPreBootstrap` won't run in workers)
    // need to conditionally export otherwise it throw an error for older versions
    exports.onPluginInit = onPluginInit;
}
else if (coreSupportsOnPluginInit === 'unstable') {
    exports.unstable_onPluginInit = onPluginInit;
}
const createResolvers = (args, pluginOptions) => {
    const typeMapKey = (0, cache_1.getCacheKey)(pluginOptions, cache_1.CACHE_KEYS.TYPE_MAP);
    const typeMap = (stateCache[typeMapKey] || remoteGraphQLSchema_1.defaultTypeMap);
    args.createResolvers((0, getGraphQLResolverMap_1.getGraphQLResolverMap)(typeMap, pluginOptions, args));
};
exports.createResolvers = createResolvers;
const createSchemaCustomization = ({ actions, schema }, pluginConfig) => {
    const { createTypes } = actions;
    const graphqlSdlKey = (0, cache_1.getCacheKey)(pluginConfig, cache_1.CACHE_KEYS.GRAPHQL_SDL);
    const graphqlSdl = stateCache[graphqlSdlKey];
    createTypes([
        graphqlSdl,
        /**
         * The following type is for the Gatsby Image CDN resolver `gatsbyImage`. SanityImageAsset already exists in `graphqlSdl` above and then this type will be merged into it, extending it with image CDN support.
         */
        (0, polyfill_remote_file_2.addRemoteFilePolyfillInterface)(schema.buildObjectType({
            name: `SanityImageAsset`,
            fields: {},
            interfaces: [`Node`, `RemoteFile`],
        }), {
            schema,
            actions,
        }),
    ]);
};
exports.createSchemaCustomization = createSchemaCustomization;
const getDocumentIds = async (client) => {
    // Largish batch size to reduce network round trips without putting too much stress on API
    const batchSize = 30000;
    let prevId;
    let ids = [];
    while (true) {
        const batch = await client.fetch(prevId !== undefined
            ? `*[!(_type match "system.**") && _id > $prevId][0...$batchSize]._id`
            : `*[!(_type match "system.**")][0...$batchSize]._id`, {
            prevId: prevId || null,
            batchSize,
        });
        ids.push(...batch);
        if (batch.length < batchSize) {
            break;
        }
        prevId = batch[batch.length - 1];
    }
    return ids;
};
const sourceNodes = async (args, pluginConfig) => {
    const config = Object.assign(Object.assign({}, defaultConfig), pluginConfig);
    const { dataset, overlayDrafts, watchMode } = config;
    const { actions, createNodeId, createContentDigest, reporter, webhookBody } = args;
    const { createNode, createParentChildLink } = actions;
    const typeMapKey = (0, cache_1.getCacheKey)(pluginConfig, cache_1.CACHE_KEYS.TYPE_MAP);
    const typeMap = (stateCache[typeMapKey] || remoteGraphQLSchema_1.defaultTypeMap);
    const client = getClient(config);
    const url = client.getUrl(`/data/export/${dataset}?tag=sanity.gatsby.source-nodes`);
    // Stitches together required methods from within the context and actions objects
    const processingOptions = {
        typeMap,
        createNodeId,
        createNode,
        createContentDigest,
        createParentChildLink,
        overlayDrafts,
        client,
    };
    // PREVIEW UPDATES THROUGH WEBHOOKS
    // =======
    // `webhookBody` is always present, even when sourceNodes is called in Gatsby's initialization.
    // As such, we need to check if it has any key to work with it.
    if (webhookBody && Object.keys(webhookBody).length > 0) {
        const webhookHandled = (0, handleWebhookEvent_1.handleWebhookEvent)(args, { client, processingOptions });
        // Even if the webhook body is invalid, let's avoid re-fetching all documents.
        // Otherwise, we'd be overloading Gatsby's preview servers on large datasets.
        if (!webhookHandled) {
            reporter.warn('[sanity] Received webhook is invalid. Make sure your Sanity webhook is configured correctly.');
            reporter.info(`[sanity] Webhook data: ${JSON.stringify(webhookBody, null, 2)}`);
        }
        return;
    }
    const gatsbyNodes = new Map();
    let documents = new Map();
    let syncWithGatsby = (0, getSyncWithGatsby_1.default)({
        documents,
        gatsbyNodes,
        args,
        processingOptions,
        typeMap,
    });
    // If we have a warm build, let's fetch only those which changed since the last build
    const lastBuildTime = (0, getPluginStatus_1.getLastBuildTime)(args);
    let deltaHandled = false;
    if (lastBuildTime) {
        try {
            // Let's make sure we keep documents nodes already in the cache (3 steps)
            // =========
            // 1/4. Get all valid document IDs from Sanity
            const documentIds = new Set(await getDocumentIds(client));
            // 2/4. Get all document types implemented in the GraphQL layer
            // @initializePlugin() will populate `stateCache` with 1+ TypeMaps
            const typeMapStateKeys = Object.keys(stateCache).filter((key) => key.endsWith('typeMap'));
            // Let's take all document types from these TypeMaps
            const sanityDocTypes = Array.from(
            // De-duplicate types with a Set
            new Set(typeMapStateKeys.reduce((types, curKey) => {
                const map = stateCache[curKey];
                const documentTypes = Object.keys(map.objects).filter((key) => map.objects[key].isDocument);
                return [...types, ...documentTypes];
            }, [])));
            // 3/4. From these types, get all nodes from store that are created from this plugin.
            // (we didn't use args.getNodes() as that'd be too expensive - hence why we limit it to Sanity-only types)
            for (const docType of sanityDocTypes) {
                args
                    .getNodesByType(docType)
                    // 4/4. touch valid documents to prevent Gatsby from deleting them
                    .forEach((node) => {
                    // If a document isn't included in documentIds, that means it was deleted since lastBuildTime. Don't touch it.
                    if (node.internal.owner === 'gatsby-source-sanity' &&
                        typeof node._id === 'string' &&
                        (documentIds.has(node._id) || documentIds.has((0, documentIds_1.unprefixId)(node._id)))) {
                        actions.touchNode(node);
                        gatsbyNodes.set((0, documentIds_1.unprefixId)(node._id), node);
                        documents.set(node._id, node);
                    }
                });
            }
            // With existing documents cached, let's handle those that changed since last build
            deltaHandled = await (0, handleDeltaChanges_1.default)({
                args,
                lastBuildTime,
                client,
                syncWithGatsby,
            });
            if (!deltaHandled) {
                reporter.warn("[sanity] Couldn't retrieve latest changes. Will fetch all documents instead.");
            }
        }
        catch (error) {
            // lastBuildTime isn't a date, ignore it
        }
    }
    function syncAllWithGatsby() {
        for (const id of documents.keys()) {
            syncWithGatsby(id);
        }
    }
    function syncIdsWithGatsby(ids) {
        for (const id of ids) {
            syncWithGatsby(id);
        }
    }
    if (watchMode) {
        // Note: since we don't setup the listener before *after* all documents has been fetched here we will miss any events that
        // happened in the time window between the documents was fetched and the listener connected. If this happens, the
        // preview will show an outdated version of the document.
        reporter.info('[sanity] Watch mode enabled, starting a listener');
        if (pluginConfig.watchModeBuffer) {
            reporter.warn("[sanity] watchModeBuffer isn't a supported option. The plugin will automatically apply changes when Gatsby can handle them.");
        }
        const gatsbyEvents = (0, rxjs_1.fromEvent)(args.emitter, '*');
        client
            .listen('*[!(_id in path("_.**"))]')
            .pipe((0, operators_1.filter)((event) => overlayDrafts || !event.documentId.startsWith('drafts.')), (0, operators_1.tap)((event) => {
            if (event.result) {
                documents.set(event.documentId, event.result);
            }
            else {
                documents.delete(event.documentId);
            }
        }), (0, operators_1.map)((event) => event.documentId), 
        // Wait `x`ms since the last internal change from Gatsby to let it rest before we add the nodes to GraphQL
        (0, operators_1.bufferWhen)(() => (0, rxjs_1.merge)(gatsbyEvents, 
        // If no Gatsby event, emit a dummy event just to unlock bufferWhen
        (0, rxjs_1.of)(0)).pipe((0, operators_1.debounceTime)(config.watchModeBuffer))), (0, operators_1.filter)((ids) => ids.length > 0), (0, operators_1.map)((ids) => (0, lodash_1.uniq)(ids)), (0, operators_1.tap)((updateIds) => (0, debug_1.default)('The following documents updated and will be synced with gatsby: ', updateIds)), (0, operators_1.tap)((updatedIds) => syncIdsWithGatsby(updatedIds)))
            .subscribe();
    }
    if (!deltaHandled) {
        reporter.info('[sanity] Fetching export stream for dataset');
        documents = await (0, downloadDocuments_1.default)(url, config.token, { includeDrafts: overlayDrafts });
        reporter.info(`[sanity] Done! Exported ${documents.size} documents.`);
        // Renew syncWithGatsby w/ latest documents Map
        syncWithGatsby = (0, getSyncWithGatsby_1.default)({
            documents,
            gatsbyNodes,
            args,
            processingOptions,
            typeMap,
        });
        // do the initial sync from sanity documents to gatsby nodes
        syncAllWithGatsby();
    }
    // register the current build time for accessing it in handleDeltaChanges for future builds
    (0, getPluginStatus_1.registerBuildTime)(args);
};
exports.sourceNodes = sourceNodes;
const setFieldsOnGraphQLNodeType = async (context, pluginConfig) => {
    const { type } = context;
    let fields = {};
    if (type.name === 'SanityImageAsset') {
        fields = Object.assign(Object.assign({}, fields), (0, extendImageNode_1.extendImageNode)(pluginConfig));
    }
    return fields;
};
exports.setFieldsOnGraphQLNodeType = setFieldsOnGraphQLNodeType;
function getClient(config) {
    const { projectId, dataset, token } = config;
    return (0, client_1.default)({
        projectId,
        dataset,
        token,
        apiVersion: '1',
        useCdn: false,
    });
}
const onCreateDevServer = async ({ app }) => {
    (0, polyfill_remote_file_1.polyfillImageServiceDevRoutes)(app);
};
exports.onCreateDevServer = onCreateDevServer;
//# sourceMappingURL=gatsby-node.js.map