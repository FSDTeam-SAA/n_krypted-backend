import express, { Request, Response } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import authRoutes from './routes/auth.routes'
import newsletterRoutes from './routes/newsletter.routes'
import reviewRoutes from './routes/review.routes'
import blogsRoutes from './routes/blog.routes'
import categoryRoutes from './routes/category.routes'
import dealRoutes from './routes/deal.routes'
import bookingRoutes from './routes/booking.routes'
import errorMiddleware from './middlewares/error.middleware'
import paymentRoutes from './routes/payment.routes'
import feedbackRoutes from './routes/feedback.routes'
import notificationRoutes from './routes/notification.routes'
import authtestRoute from './routes/authtest'
import blogCommentRoutes from './routes/blogComment.routes'

const app = express()

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// JSON parsing and validation middleware
app.use(
  bodyParser.json({
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
app.use('/api', bookingRoutes)
app.use('/api', paymentRoutes)
app.use('/api', feedbackRoutes)
app.use('/api', notificationRoutes)
app.use('/api', authtestRoute)
app.use('/api', blogCommentRoutes)

app.use(errorMiddleware)

export default app
