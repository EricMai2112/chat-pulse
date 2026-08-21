import http from '@/utils/http'

export const callApi = {
  getLiveKitToken: (conversationId: string, userName: string) => {
    return http.get<{ message: string; result: { token: string } }>('/calls/token', {
      params: {
        conversationId,
        roomName: conversationId, // Truyền cả 2 tên để backend đọc kiểu nào cũng nhận
        userName
      }
    })
  },
  getActiveCall: (conversationId: string) => {
    return http.get<{ message: string; result: any }>(`/calls/active/${conversationId}`)
  }
}
