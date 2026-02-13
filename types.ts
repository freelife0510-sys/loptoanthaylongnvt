export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  image?: string; // base64
  isError?: boolean;
}

export interface Topic {
  id: string;
  title: string;
  grade: number;
  prompts: string[];
}

export interface GraphDataPoint {
  x: number;
  y: number;
}

// --- New Types for Lesson Planning ---

export interface LessonInput {
  subject: string; // Môn học
  topic: string; // Tên bài học
  grade: string; // Lớp
  duration: string; // Thời lượng
  objectives: string; // Yêu cầu cần đạt
  lessonFile?: File; // File giáo án (docx, pdf)
  ppctFile?: File; // File phân phối chương trình (docx, pdf)
}

export interface AnalysisResult {
  competencyAssessment: string[]; // Đánh giá mức độ đáp ứng 3439/QĐ-BGDĐT
  suggestions: string[]; // Gợi ý điều chỉnh
}

export interface LessonActivity {
  id: string;
  name: string; // Hoạt động 1, 2, 3, 4
  objective: string; // Mục tiêu hoạt động
  content: string; // Nội dung
  product: string; // Sản phẩm dự kiến
  organization: string; // Tổ chức thực hiện
}

export interface LessonPlan {
  title: string;
  grade: string;
  objectives: {
    knowledge: string;
    competence: string;
    quality: string;
  };
  equipment: string;
  activities: LessonActivity[];
}
