# Lớp Học Thầy Long 🧮

Ứng dụng hỗ trợ học Toán tích hợp AI (Google Gemini), gồm 2 chức năng chính:

- **Hỏi đáp Toán học** – Chat với "Thầy Long" AI theo phong cách sư phạm Việt Nam
- **Soạn giáo án (KHBD)** – Tự động tạo Kế hoạch bài dạy theo Công văn 5512 & QĐ 3439

## Cài đặt

### 1. Clone repository

```bash
git clone <repo-url>
cd lophocthaylong
```

### 2. Cài dependencies

```bash
npm install
```

### 3. Cấu hình API Key

Tạo file `.env.local` từ file mẫu:

```bash
cp .env.example .env.local
```

Mở `.env.local` và thay `your_gemini_api_key_here` bằng API key thật từ [Google AI Studio](https://aistudio.google.com/apikey).

### 4. Chạy ứng dụng

```bash
npm run dev
```

Mở trình duyệt tại **http://localhost:3000**

## Build production

```bash
npm run build
npm run preview
```

## Công nghệ sử dụng

- **React 19** + **TypeScript**
- **Vite** – Build tool
- **Google Gemini AI** – API trí tuệ nhân tạo
- **TailwindCSS** (CDN) – Styling
- **KaTeX** – Hiển thị công thức Toán
- **Recharts** – Vẽ đồ thị hàm số

## Cấu trúc thư mục

```
├── App.tsx                 # Component chính
├── index.html              # Entry HTML
├── index.tsx               # React entry point
├── index.css               # Custom animations
├── types.ts                # TypeScript type definitions
├── constants.ts            # System prompts & mock data
├── vite.config.ts          # Vite configuration
├── components/
│   ├── Sidebar.tsx         # Sidebar navigation
│   ├── InputForm.tsx       # Form nhập thông tin bài dạy
│   ├── AnalysisResult.tsx  # Hiển thị phân tích AI
│   ├── LessonPlanResult.tsx# Hiển thị giáo án
│   ├── MathRenderer.tsx    # Render công thức KaTeX
│   └── GraphTool.tsx       # Công cụ vẽ đồ thị
└── services/
    └── geminiService.ts    # Kết nối Gemini API
```
