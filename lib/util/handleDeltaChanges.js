"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = void 0;
const debug_1 = __importDefault(require("../debug"));
const getPluginStatus_1 = require("./getPluginStatus");
const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
exports.sleep = sleep;
// Ensures document changes are persisted to the query engine.
const SLEEP_DURATION = 500;
/**
 * Queries all documents changed since last build & adds them to Gatsby's store
 */
async function handleDeltaChanges({ args, lastBuildTime, client, syncWithGatsby, }) {
    await (0, exports.sleep)(SLEEP_DURATION);
    try {
        const changedDocs = await client.fetch('*[!(_type match "system.**") && _updatedAt > $timestamp]', {
            timestamp: lastBuildTime.toISOString(),
        });
        changedDocs.forEach((doc) => {
            syncWithGatsby(doc._id, doc);
        });
        (0, getPluginStatus_1.registerBuildTime)(args);
        args.reporter.info(`[sanity] ${changedDocs.length} documents updated.`);
        return true;
    }
    catch (error) {
        (0, debug_1.default)(`[sanity] failed to handleDeltaChanges`, error);
        return false;
    }
}
exports.default = handleDeltaChanges;
//# sourceMappingURL=handleDeltaChanges.js.map