import { Request, Response } from 'express'
import sanitizeHtml from 'sanitize-html'

import SiteContent from '../models/SiteContent.model'

const cleanRichText = (value: unknown) =>
  sanitizeHtml(value?.toString() ?? '', {
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
      a: sanitizeHtml.simpleTransform('a', {
        target: '_blank',
        rel: 'noopener noreferrer',
      }),
    },
  }).trim()

export const getLegalContent = async (_req: Request, res: Response) => {
  const content = await SiteContent.findOne({ key: 'legal' }).lean()
  res.status(200).json({
    success: true,
    content: {
      termsHtml: content?.termsHtml ?? '',
      privacyHtml: content?.privacyHtml ?? '',
      updatedAt: (content as any)?.updatedAt ?? null,
    },
  })
}

export const updateLegalContent = async (req: Request, res: Response) => {
  const hasTerms = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'termsHtml')
  const hasPrivacy = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'privacyHtml')
  if (!hasTerms && !hasPrivacy) {
    res.status(400).json({
      success: false,
      message: 'Terms or privacy content is required',
    })
    return
  }

  const termsHtml = hasTerms ? cleanRichText(req.body.termsHtml) : undefined
  const privacyHtml = hasPrivacy ? cleanRichText(req.body.privacyHtml) : undefined
  if ((hasTerms && !termsHtml) || (hasPrivacy && !privacyHtml)) {
    res.status(400).json({ success: false, message: 'Legal content cannot be empty' })
    return
  }
  if ((termsHtml?.length ?? 0) > 100_000 || (privacyHtml?.length ?? 0) > 100_000) {
    res.status(413).json({ success: false, message: 'Legal content is too long' })
    return
  }

  const update: Record<string, unknown> = { updatedBy: req.user?.id }
  if (termsHtml !== undefined) update.termsHtml = termsHtml
  if (privacyHtml !== undefined) update.privacyHtml = privacyHtml
  const content = await SiteContent.findOneAndUpdate(
    { key: 'legal' },
    { $set: update, $setOnInsert: { key: 'legal' } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean()

  res.status(200).json({ success: true, content })
}
