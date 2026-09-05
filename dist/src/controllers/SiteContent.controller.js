"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLegalContent = exports.getLegalContent = void 0;
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const SiteContent_model_1 = __importDefault(require("../models/SiteContent.model"));
const cleanRichText = (value) => (0, sanitize_html_1.default)(value?.toString() ?? '', {
    allowedTags: [
        'h1',
        'h2',
        'h3',
        'p',
        'br',
        'strong',
        'em',
        'u',
        'ul',
        'ol',
        'li',
        'blockquote',
        'a',
    ],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
        a: sanitize_html_1.default.simpleTransform('a', {
            target: '_blank',
            rel: 'noopener noreferrer',
        }),
    },
}).trim();
const getLegalContent = async (_req, res) => {
    const content = await SiteContent_model_1.default.findOne({ key: 'legal' }).lean();
    res.status(200).json({
        success: true,
        content: {
            termsHtml: content?.termsHtml ?? '',
            privacyHtml: content?.privacyHtml ?? '',
            updatedAt: content?.updatedAt ?? null,
        },
    });
};
exports.getLegalContent = getLegalContent;
const updateLegalContent = async (req, res) => {
    const hasTerms = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'termsHtml');
    const hasPrivacy = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'privacyHtml');
    if (!hasTerms && !hasPrivacy) {
        res.status(400).json({
            success: false,
            message: 'Terms or privacy content is required',
        });
        return;
    }
    const termsHtml = hasTerms ? cleanRichText(req.body.termsHtml) : undefined;
    const privacyHtml = hasPrivacy ? cleanRichText(req.body.privacyHtml) : undefined;
    if ((hasTerms && !termsHtml) || (hasPrivacy && !privacyHtml)) {
        res.status(400).json({ success: false, message: 'Legal content cannot be empty' });
        return;
    }
    if ((termsHtml?.length ?? 0) > 100000 || (privacyHtml?.length ?? 0) > 100000) {
        res.status(413).json({ success: false, message: 'Legal content is too long' });
        return;
    }
    const update = { updatedBy: req.user?.id };
    if (termsHtml !== undefined)
        update.termsHtml = termsHtml;
    if (privacyHtml !== undefined)
        update.privacyHtml = privacyHtml;
    const content = await SiteContent_model_1.default.findOneAndUpdate({ key: 'legal' }, { $set: update, $setOnInsert: { key: 'legal' } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }).lean();
    res.status(200).json({ success: true, content });
};
exports.updateLegalContent = updateLegalContent;
