import express, { Request, Response } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import authRoutes from './routes/auth.routes'
import newsletterRoutes from './routes/newsletter.routes'
import reviewRoutes from './routes/review.routes'
import blogsRoutes from './routes/blog.routes'
import categoryRoutes from './routes/category.routes'
import dealRoutes from './routes/deal.routes'
import errorMiddleware from './middlewares/error.middleware'
import checkInRoutes from './routes/checkIn.routes'
import feedbackRoutes from './routes/feedback.routes'
import notificationRoutes from './routes/notification.routes'
import authtestRoute from './routes/authtest'
import blogCommentRoutes from './routes/blogComment.routes'
import siteContentRoutes from './routes/siteContent.routes'

const app = express()

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
)

// --- UPDATED LIMITS TO '100mb' ---
// Allows large base64 image data in the request body to be parsed.
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))
// ----------------------------------

// JSON parsing and validation middleware
app.use(
  bodyParser.json({
    limit: '100mb', // --- UPDATED LIMIT HERE TOO ---
    verify: (req: Request, res: Response, buf: Buffer) => {
      try {
        JSON.parse(buf.toString())
      } catch (e: any) {
        res.status(400).json({
          success: false,
          error: 'Invalid JSON payload',
          details: e?.message || 'Unknown error',
        })
        throw e
      }
    },
  })
)

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!')
  console.log('Hello World!')
})

app.use('/api/auth', authRoutes)
app.use('/api', newsletterRoutes)
app.use('/api', reviewRoutes)
app.use('/api', blogsRoutes)
app.use('/api', categoryRoutes)
app.use('/api', dealRoutes)
app.use('/api', checkInRoutes)
app.use('/api', feedbackRoutes)
app.use('/api', notificationRoutes)
app.use('/api', authtestRoute)
app.use('/api', blogCommentRoutes)
app.use('/api', siteContentRoutes)

app.use(errorMiddleware)

export default app
