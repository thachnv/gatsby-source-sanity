"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGatsbyImageData = exports.ImageFormat = exports.EVERY_BREAKPOINT = void 0;
const gatsby_plugin_image_1 = require("gatsby-plugin-image");
const image_url_1 = __importDefault(require("@sanity/image-url"));
exports.EVERY_BREAKPOINT = [
    320,
    654,
    768,
    1024,
    1366,
    1600,
    1920,
    2048,
    2560,
    3440,
    3840,
    4096,
];
var ImageFormat;
(function (ImageFormat) {
    ImageFormat["NO_CHANGE"] = "";
    ImageFormat["WEBP"] = "webp";
    ImageFormat["JPG"] = "jpg";
    ImageFormat["PNG"] = "png";
})(ImageFormat = exports.ImageFormat || (exports.ImageFormat = {}));
const idPattern = /^image-[A-Za-z0-9]+-\d+x\d+-[a-z]+$/;
function buildImageUrl(loc, stub) {
    const { projectId, dataset } = loc;
    const { assetId, extension, metadata } = stub;
    const { width, height } = metadata.dimensions;
    const base = 'https://cdn.sanity.io/images';
    return `${base}/${projectId}/${dataset}/${assetId}-${width}x${height}.${extension}`;
}
function getBasicImageProps(node, loc) {
    if (!node) {
        return false;
    }
    const obj = node;
    const ref = node;
    const img = node;
    let id = '';
    if (typeof node === 'string') {
        id = node;
    }
    else if (obj.asset) {
        id = obj.asset._ref || obj.asset._id;
    }
    else {
        id = ref._ref || img._id;
    }
    const hasId = !id || idPattern.test(id);
    if (!hasId) {
        return false;
    }
    const [, assetId, dimensions, extension] = id.split('-');
    const [width, height] = dimensions.split('x').map((num) => parseInt(num, 10));
    const aspectRatio = width / height;
    const metadata = img.metadata || { dimensions: { width, height, aspectRatio } };
    const url = img.url || buildImageUrl(loc, { url: '', assetId, extension, metadata });
    return {
        url,
        assetId,
        extension,
        metadata,
    };
}
const fitMap = new Map([
    [`clip`, `inside`],
    [`crop`, `cover`],
    [`fill`, `contain`],
    [`fillmax`, `contain`],
    [`max`, `inside`],
    [`scale`, `fill`],
    [`min`, `inside`],
]);
const generateImageSource = (filename, width, height, toFormat, fit, options) => {
    const { builder } = options;
    const src = builder.width(width).height(height).auto('format').url();
    return { width, height, format: 'auto', src };
};
// gatsby-plugin-image
function getGatsbyImageData(image, _a, loc) {
    var _b, _c;
    var { fit } = _a, args = __rest(_a, ["fit"]);
    const imageStub = getBasicImageProps(image, loc);
    if (!imageStub || !image) {
        return null;
    }
    const { width, height } = imageStub.metadata.dimensions;
    const builder = (0, image_url_1.default)(loc).image(image);
    const imageProps = (0, gatsby_plugin_image_1.generateImageData)(Object.assign(Object.assign({}, args), { pluginName: `gatsby-source-sanity`, sourceMetadata: {
            format: 'auto',
            width,
            height,
        }, fit: fit ? fitMap.get(fit) : undefined, filename: imageStub.url, generateImageSource, options: { builder }, formats: ['auto'], breakpoints: exports.EVERY_BREAKPOINT }));
    let placeholderDataURI;
    if (args.placeholder === `dominantColor`) {
        imageProps.backgroundColor = (_c = (_b = imageStub.metadata.palette) === null || _b === void 0 ? void 0 : _b.dominant) === null || _c === void 0 ? void 0 : _c.background;
    }
    if (args.placeholder === `blurred`) {
        imageProps.placeholder = imageStub.metadata.lqip
            ? { fallback: imageStub.metadata.lqip }
            : undefined;
    }
    if (placeholderDataURI) {
        imageProps.placeholder = { fallback: placeholderDataURI };
    }
    return imageProps;
}
exports.getGatsbyImageData = getGatsbyImageData;
//# sourceMappingURL=getGatsbyImageProps.js.map