// frontend/src/context/socket.context.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { AppContext } from './app.context'
import { getAccessTokenFromLS } from '@/utils/auth'

interface SocketContextType {
  socket: Socket | null
}

const SocketContext = createContext<SocketContextType>({ socket: null })
export const useSocket = () => useContext(SocketContext)

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const { isAuthenticated, profile } = useContext(AppContext)

  useEffect(() => {
    if (isAuthenticated && profile) {
      const accessToken = getAccessTokenFromLS()

      // Loại bỏ /api ở cuối VITE_API_URL để lấy đúng origin domain
      const baseUrl = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
        : window.location.origin

      const newSocket = io(baseUrl, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        auth: {
          token: accessToken,
          user_id: profile._id
        }
      })

      newSocket.on('connect', () => {
        console.log('✅ [Socket.IO] Đã kết nối thành công ID:', newSocket.id)
      })

      newSocket.on('connect_error', (err) => {
        console.error('❌ [Socket.IO] Lỗi kết nối:', err.message)
      })

      setSocket(newSocket)

      return () => {
        newSocket.disconnect()
      }
    }
  }, [isAuthenticated, profile])

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>
}
