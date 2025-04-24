import express from 'express'
import authRoutes from './routes/auth.routes'
import newsletterRoutes from './routes/newsletter.routes'
import reviewRoutes from './routes/review.routes'
import blogsRoutes from './routes/blog.routes'
import categoryRoutes from './routes/category.routes'
import dealRoutes from './routes/deal.routes'
import bookingRoutes from './routes/booking.routes'
import errorMiddleware from './middlewares/error.middleware'

const app = express()

app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api', newsletterRoutes)
app.use('/api', reviewRoutes)
app.use('/api', blogsRoutes)
app.use('/api', categoryRoutes)
app.use('/api', dealRoutes)
app.use('/api', bookingRoutes)

app.use(errorMiddleware)

export default app
