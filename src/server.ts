import dotenv from 'dotenv'
dotenv.config()

import app from './app'
import { connectDB } from './config/db'
import http from 'http'
import { initializeSocket } from './socket/socket'
import { startImageCleanupWorker } from './utils/imageCleanup'

const server = http.createServer(app)

// Initialize Socket.IO
const io = initializeSocket(server)

// Export io instance for use in other files
export { io }

const PORT = process.env.PORT || 5000

connectDB().then(() => {
  startImageCleanupWorker()
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
})
