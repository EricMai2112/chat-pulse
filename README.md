# 💬 ChatPulse - Nền tảng Nhắn tin & Gọi Video Real-time Triển khai Hạ tầng AWS Cloud

> **ChatPulse** là một hệ thống truyền thông thời gian thực (real-time) toàn diện trên nền tảng Web. Dự án nổi bật với các công nghệ hiện đại như Mã hóa đầu cuối (E2EE) để bảo vệ quyền riêng tư, Gọi video/audio chất lượng cao qua WebRTC, trợ năng giọng nói thông minh và được vận hành trên hạ tầng đám mây AWS với luồng CI/CD tự động hóa.

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=white)](#)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](#)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?logo=socket.dot_io&logoColor=white)](#)
[![LiveKit](https://img.shields.io/badge/LiveKit-WebRTC-5B21B6?logo=webrtc&logoColor=white)](#)
[![AWS](https://img.shields.io/badge/AWS-Cloud_Infrastructure-FF9900?logo=amazon-web-services&logoColor=white)](#)
[![CI/CD](https://img.shields.io/badge/AWS-CodePipeline_%26_CodeBuild-232F3E?logo=amazon-aws&logoColor=white)](#)

---

## 🚀 Demo & Tài khoản Trải nghiệm

- **Link Live Demo (Web App):** [https://ericmai.io.vn](https://ericmai.io.vn)
- **API & Backend Endpoint:** [https://api.ericmai.io.vn](https://api.ericmai.io.vn)
- **Tài khoản trải nghiệm nhanh:**
  - **Email:** `mait58674@gmail.com`
  - **Mật khẩu (Password):** `123123`

_(Bạn cũng có thể tự đăng ký tài khoản mới trực tiếp trên giao diện để trải nghiệm toàn bộ tính năng)._

---

## ✨ Các Tính Năng Nổi Bật

- **Trò chuyện thời gian thực (Real-time Chat):** Gửi tin nhắn, trạng thái online/offline, thông báo đang nhập văn bản (typing indicator) và trạng thái tin nhắn (đã gửi/đã đọc) thông qua **Socket.io**.
- **Gọi Video & Audio chất lượng cao:** Thực hiện các cuộc gọi cá nhân hoặc cuộc gọi nhóm thời gian thực, độ trễ cực thấp dựa trên **LiveKit (WebRTC)** và **Simple Peer**.
- **Trợ lý AI & Trợ năng giọng nói:** Tích hợp **Gemini AI** / **Groq** hỗ trợ phản hồi thông minh trong hội thoại kết hợp **Amazon Polly** chuyển văn bản thành giọng nói (Text-to-Speech).
- **Quản lý file & Email chuyên nghiệp:** Upload tệp tin dung lượng lớn qua **AWS S3** và **Cloudinary**; Gửi email xác thực tài khoản và thông báo qua **AWS SES** / **Nodemailer**.
- **Tự động hóa CI/CD:** Tự động build và deploy Frontend lên S3/CloudFront qua **AWS CodePipeline** và **AWS CodeBuild**.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

### Giao diện (Frontend Client)

- **Web client:** React 19, Vite, TailwindCSS v4, Radix UI (shadcn)
- **Quản lý trạng thái & Caching:** Zustand, TanStack React Query (v5)
- **Kết nối mạng & Media:** Axios, Socket.io-client, LiveKit-client, Simple-peer

### Máy chủ & Cơ sở dữ liệu (Backend & Database)

- **Runtime & Web Framework:** Node.js, Express, TypeScript
- **Cơ sở dữ liệu:** MongoDB (Sử dụng Driver gốc để tối ưu hóa truy vấn)
- **Bộ nhớ đệm (Caching):** Amazon ElastiCache (Redis)
- **Real-Time & WebRTC:** Socket.io, LiveKit Server SDK
- **Trí tuệ nhân tạo (AI) & Giọng nói:** Google Generative AI, Groq SDK, Amazon Polly
- **Dịch vụ Đám mây & Lưu trữ:** AWS S3, AWS SES, Cloudinary

### Hạ tầng Điện toán đám mây & DevOps (AWS Infrastructure & CI/CD)

- **Mạng & Bảo mật:** Amazon Route 53, AWS WAF, AWS Certificate Manager (ACM), Amazon CloudFront (CDN)
- **Máy chủ ứng dụng:** Amazon EC2 (VPC / Public Subnet), Nginx Reverse Proxy, PM2
- **Giám sát:** Amazon CloudWatch
- **CI/CD Pipeline:** GitHub, AWS CodePipeline, AWS CodeBuild

---

## 📐 Kiến Trúc Hệ Thống (Architecture)

Hệ thống được thiết kế và vận hành trực tiếp trên nền tảng **Amazon Web Services (AWS)** với mô hình phân tầng chặt chẽ:

### 1. Phân Tầng Dịch Vụ Mạng & Bảo Mật (Edge Services)

- **Amazon Route 53:** Quản lý bản ghi DNS, điều phối phân giải tên miền chính và subdomain với độ trễ thấp.
- **AWS Certificate Manager (ACM):** Cung cấp và quản lý chứng chỉ SSL/TLS, mã hóa HTTPS/WSS cho toàn bộ hệ thống.
- **AWS WAF:** Tường lửa lớp ứng dụng (Layer 7) lọc lưu lượng truy cập độc hại, ngăn chặn tấn công giả mạo, SQLi và XSS.
- **Amazon CloudFront:** Phân phối nội dung tĩnh (CDN) toàn cầu, lưu edge cache giúp tăng tốc độ tải trang cho người dùng.

### 2. Máy Chủ & Bộ Nhớ Đệm (Region / VPC)

- **Amazon EC2 (Public Subnet):** Máy chủ chạy ứng dụng Backend Node.js/Express, Engine Socket.IO và Nginx Reverse Proxy.
- **Amazon ElastiCache (Private Subnet):** Cụm Redis In-Memory lưu trữ phiên làm việc (session), quản lý trạng thái online/offline thời gian thực với độ trễ mili-giây.
- **MongoDB:** Cơ sở dữ liệu phân tán lưu trữ toàn bộ người dùng, nhóm chat và lịch sử tin nhắn.

### 3. Dịch Vụ Lưu Trữ, Hỗ Trợ & Giám Sát

- **Amazon S3:** Lưu trữ bundle tĩnh của Frontend (`dist/`) và media (avatar, file đính kèm).
- **Amazon SES:** Cổng gửi email thông báo, xác thực tài khoản và mã OTP giao dịch.
- **Amazon Polly:** Dịch vụ Text-to-Speech chuyển đổi tin nhắn văn bản thành giọng đọc tự nhiên.
- **Amazon CloudWatch:** Giám sát thời gian thực số liệu phần cứng EC2 (CPU Utilization, Network Traffic) và kích hoạt cảnh báo tự động.

### 4. Luồng Tự Động Hóa CI/CD (CI/CD Pipeline)

- **GitHub:** Tiếp nhận commit mã nguồn mới nhất từ Developer trên nhánh `main`.
- **AWS CodePipeline:** Tự động bắt sự kiện webhook từ GitHub và chuyển tiếp sang môi trường build.
- **AWS CodeBuild:** Khởi tạo container độc lập thực thi `npm run build`, đồng bộ thư mục tĩnh lên **Amazon S3** (`aws s3 sync`) và gửi lệnh xóa cache tức thì trên **Amazon CloudFront** (`aws cloudfront create-invalidation`).

---

### 🔒 Cơ chế hoạt động của Mã hóa đầu cuối (E2EE):

1. **Khởi tạo khóa:** Khi đăng ký, thiết bị của người dùng sẽ tự tạo một cặp khóa RSA (Public Key & Private Key). **Public Key** được gửi lên server để chia sẻ, còn **Private Key** được lưu trữ an toàn trong bộ nhớ trình duyệt của người dùng (không gửi lên server).
2. **Mã hóa tin nhắn:** Khi gửi tin nhắn, thiết bị tự sinh ra một khóa đối xứng AES ngẫu nhiên. Nội dung tin nhắn sẽ được mã hóa bằng khóa AES này.
3. **Trao đổi khóa:** Khóa AES tiếp tục được mã hóa bằng **RSA Public Key** của người nhận trước khi gửi lên server.
4. **Giải mã:** Khi người nhận tải tin nhắn về, thiết bị dùng **RSA Private Key** của mình để giải mã khóa AES, sau đó dùng khóa AES giải mã nội dung tin nhắn ban đầu.

---

## 🧠 Thử Thách Kỹ Thuật & Bài Học Kinh Nghiệm

### 1. Quản lý và Bảo mật Private Key Client-side

- **Vấn đề:** Làm sao để người dùng lưu trữ an toàn khóa Private Key trên trình duyệt mà không làm lộ dữ liệu khi bị tấn công XSS hoặc truy cập trái phép.
- **Giải pháp:** Sử dụng cơ chế lưu trữ mã hóa khóa bí mật bằng mật khẩu cấp 2 (Passcode) của người dùng thông qua hàm băm KDF (PBKDF2) kết hợp IndexedDB có cơ chế bảo vệ phiên.

### 2. Tự động hóa Triển khai và Đồng bộ Cache CDN

- **Vấn đề:** Khi cập nhật phiên bản Frontend mới lên S3, người dùng vẫn bị tải lại bản cũ do cơ chế Edge Caching lâu dài của CloudFront.
- **Giải pháp:** Thiết lập script trong `buildspec.yml` của AWS CodeBuild tự động chạy lệnh tạo invalidation `/*` ngay sau khi tải tệp lên S3, giúp bản build mới xuất hiện lập tức trên toàn cầu.

### 3. Tối ưu hóa Kết nối Real-time & WebRTC

- **Vấn đề:** Đảm bảo độ trễ âm thanh/hình ảnh ở mức tối thiểu và duy trì kết nối WebSocket ổn định khi lượng người dùng đồng thời tăng cao.
- **Giải pháp:** Kết hợp LiveKit WebRTC SFU Server để điều phối luồng media thay vì truyền tải qua server backend, đồng thời cấu hình Nginx Reverse Proxy trên EC2 hỗ trợ `Upgrade` headers cho kết nối WebSocket lâu dài.
