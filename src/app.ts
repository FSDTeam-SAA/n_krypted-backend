import express from 'express'
import authRoutes from './routes/auth.routes'
import errorMiddleware from './middlewares/error.middleware'

const app = express()

app.use(express.json())

app.use('/api/auth', authRoutes)

app.use(errorMiddleware)

export default app
