import express from 'express'
import userRoutes from './routes/user.routes'
import errorMiddleware from './middlewares/error.middleware'

const app = express()

app.use(express.json())

app.use('/api/users', userRoutes)

app.use(errorMiddleware)

export default app
