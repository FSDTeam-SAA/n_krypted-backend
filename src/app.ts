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

const app = express()

app.use(cors())

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

app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api', newsletterRoutes)
app.use('/api', reviewRoutes)
app.use('/api', blogsRoutes)
app.use('/api', categoryRoutes)
app.use('/api', dealRoutes)
app.use('/api', bookingRoutes)
app.use('/api', paymentRoutes)

app.use(errorMiddleware)

export default app
