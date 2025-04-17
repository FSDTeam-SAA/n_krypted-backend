import express from 'express'
import authRoutes from './routes/auth.routes'
import newsletterRoutes from './routes/newsletter.routes'
import reviewRoutes from './routes/review.routes'
import blogsRoutes from './routes/blog.routes'
import errorMiddleware from './middlewares/error.middleware'

const app = express()

app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/newsletter', newsletterRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/blog', blogsRoutes)

app.use(errorMiddleware)

export default app
