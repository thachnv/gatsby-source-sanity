"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConflictFreeFieldName = exports.getTypeName = exports.toGatsbyNode = exports.RESTRICTED_NODE_FIELDS = void 0;
const mutator_1 = require("@sanity/mutator");
const graphql_1 = require("gatsby/graphql");
const lodash_1 = require("lodash");
const documentIds_1 = require("./documentIds");
const image_url_1 = __importDefault(require("@sanity/image-url"));
const scalarTypeNames = graphql_1.specifiedScalarTypes.map((def) => def.name).concat(['JSON', 'Date']);
// Movie => SanityMovie
const typePrefix = 'Sanity';
// Node fields used internally by Gatsby.
exports.RESTRICTED_NODE_FIELDS = ['id', 'children', 'parent', 'fields', 'internal'];
// Transform a Sanity document into a Gatsby node
function toGatsbyNode(doc, options) {
    var _a, _b, _c, _d, _e, _f;
    const { createNodeId, createContentDigest, overlayDrafts } = options;
    const rawAliases = getRawAliases(doc, options);
    const safe = prefixConflictingKeys(doc);
    const withRefs = rewriteNodeReferences(safe, options);
    const type = getTypeName(doc._type);
    const urlBuilder = (0, image_url_1.default)(options.client);
    const gatsbyImageCdnFields = [`SanityImageAsset`, `SanityFileAsset`].includes(type)
        ? {
            filename: withRefs.originalFilename,
            width: (_b = (_a = withRefs === null || withRefs === void 0 ? void 0 : withRefs.metadata) === null || _a === void 0 ? void 0 : _a.dimensions) === null || _b === void 0 ? void 0 : _b.width,
            height: (_d = (_c = withRefs === null || withRefs === void 0 ? void 0 : withRefs.metadata) === null || _c === void 0 ? void 0 : _c.dimensions) === null || _d === void 0 ? void 0 : _d.height,
            url: withRefs === null || withRefs === void 0 ? void 0 : withRefs.url,
            placeholderUrl: type === `SanityImageAsset`
                ? (_f = (_e = urlBuilder
                    .image(withRefs.url)
                    .width(20)
                    .height(30)
                    .quality(80)
                    .url()) === null || _e === void 0 ? void 0 : _e.replace(`w=20`, `w=%width%`)) === null || _f === void 0 ? void 0 : _f.replace(`h=30`, `h=%height%`)
                : null,
        }
        : {};
    return Object.assign(Object.assign(Object.assign(Object.assign({}, withRefs), rawAliases), gatsbyImageCdnFields), { id: (0, documentIds_1.safeId)(overlayDrafts ? (0, documentIds_1.unprefixId)(doc._id) : doc._id, createNodeId), children: [], internal: {
            type,
            contentDigest: createContentDigest(JSON.stringify(withRefs)),
        } });
}
exports.toGatsbyNode = toGatsbyNode;
// movie => SanityMovie
// blog_post => SanityBlogPost
// sanity.imageAsset => SanityImageAsset
function getTypeName(type) {
    if (!type) {
        return type;
    }
    const typeName = (0, lodash_1.startCase)(type);
    if (scalarTypeNames.includes(typeName)) {
        return typeName;
    }
    return `${typePrefix}${typeName.replace(/\s+/g, '').replace(/^Sanity/, '')}`;
}
exports.getTypeName = getTypeName;
// {foo: 'bar', children: []} => {foo: 'bar', sanityChildren: []}
function prefixConflictingKeys(obj) {
    // Will be overwritten, but initialize for type safety
    const initial = { _id: '', _type: '', _rev: '', _createdAt: '', _updatedAt: '' };
    return Object.keys(obj).reduce((target, key) => {
        const targetKey = getConflictFreeFieldName(key);
        target[targetKey] = obj[key];
        return target;
    }, initial);
}
function getConflictFreeFieldName(fieldName) {
    return exports.RESTRICTED_NODE_FIELDS.includes(fieldName)
        ? `${(0, lodash_1.camelCase)(typePrefix)}${(0, lodash_1.upperFirst)(fieldName)}`
        : fieldName;
}
exports.getConflictFreeFieldName = getConflictFreeFieldName;
function getRawAliases(doc, options) {
    const { typeMap } = options;
    const typeName = getTypeName(doc._type);
    const type = typeMap.objects[typeName];
    if (!type) {
        return {};
    }
    const initial = {};
    return Object.keys(type.fields).reduce((acc, fieldName) => {
        const field = type.fields[fieldName];
        const namedType = field.namedType.name.value;
        if (field.aliasFor) {
            const aliasName = '_' + (0, lodash_1.camelCase)(`raw_data_${field.aliasFor}`);
            acc[aliasName] = doc[field.aliasFor];
            return acc;
        }
        if (typeMap.scalars.includes(namedType)) {
            return acc;
        }
        const aliasName = '_' + (0, lodash_1.camelCase)(`raw_data_${fieldName}`);
        acc[aliasName] = doc[fieldName];
        return acc;
    }, initial);
}
// Tranform Sanity refs ({_ref: 'foo'}) to Gatsby refs ({_ref: 'someOtherId'})
function rewriteNodeReferences(doc, options) {
    const { createNodeId } = options;
    const refs = (0, mutator_1.extractWithPath)('..[_ref]', doc);
    if (refs.length === 0) {
        return doc;
    }
    const newDoc = (0, lodash_1.cloneDeep)(doc);
    refs.forEach((match) => {
        (0, lodash_1.set)(newDoc, match.path, (0, documentIds_1.safeId)(match.value, createNodeId));
    });
    return newDoc;
}
//# sourceMappingURL=normalize.js.map