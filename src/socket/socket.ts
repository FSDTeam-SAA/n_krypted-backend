import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'
import Booking from '../models/Booking.model'
import Notification from '../models/Notification.model'
import UserModel from '../models/User.model'

// Store connected users
const connectedUsers = new Map<string, string>()

export const initializeSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['Get', 'POST'],
    },
  })

  // socket.io connection
  io.on('connection', (socket) => {

    // Handle user authentication
    socket.on('authenticate', async (userId: string) => {
      // Store the user's socket ID
      socket.join(userId.toString())
      console.log(`User ${userId} authenticated with socket ${socket.id}`)

      // // Send any pending notifications to the user
      // try {
      //   const notifications = await Notification.find({
      //     userId,
      //     isRead: false
      //   }).sort({ createdAt: -1 })

      //   if (notifications.length > 0) {
         
      //   }
      // } catch (error) {
      //   console.error('Error fetching pending notifications:', error)
      // }
    })
  
    

    // Handle marking notifications as read
    socket.on('mark_notification_read', async (notificationId: string) => {
      try {
        await Notification.findByIdAndUpdate(notificationId, { isRead: true })
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      // Remove the user from connectedUsers
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId)
          console.log(`User ${userId} disconnected`)
          break
        }
      }
    })
  })

  return io
}

// Function to notify all users about new deal
export const notifyNewDeal = async (io: Server, deal: any) => {
  // Emit to all connected users
  io.emit('new_deal', {
    message: 'New deal available!',
    deal
  })

  // Store notification for all users who have notifyMe true
  try {

  const userId = await UserModel.find().select("_id")
    
    for (const booking of userId) {
      const userId = booking._id
      // If user is not connected, store the notification
        await Notification.create({
          userId,
          message: 'New deal available!',
          type: 'new_deal',
          dealId: deal._id
        })
    }
  } catch (error) {
    console.error('Error storing new deal notifications:', error)
  }
}

// Function to notify specific users about deal status change
// export const notifyDealStatusChange = async (io: Server, dealsId: string, newStatus: string) => {
//   try {
//     // Find all bookings with notifyMe true for this deal
//     const bookings = await Booking.find({
//       dealsId: dealsId,
//       notifyMe: true,
//     }).populate('userId')

//     if (!bookings || bookings.length === 0) {
//       console.log('No users to notify for this deal status change')
//       return
//     }

//     // Notify each user who has notifyMe true
//     for (const booking of bookings) {
//       const userId = booking.userId
//       const userSocketId = connectedUsers.get(userId.toString())
      
//       if (userSocketId) {
//         // User is connected, send real-time notification
//         io.to(userSocketId).emit('deal_status_change', {
//           message: `Deal status changed to ${newStatus}`,
//           dealsId,
//           newStatus,
//         })
//       } else {
//         // User is not connected, store the notification
//         await Notification.create({
//           userId,
//           message: `Deal status changed to ${newStatus}`,
//           type: 'deal_status_change',
//           dealId: dealsId
//         })
//       }
//     }
//   } catch (error) {
//     console.error('Error notifying users about deal status change:', error)
//     throw error
//   }
// } 