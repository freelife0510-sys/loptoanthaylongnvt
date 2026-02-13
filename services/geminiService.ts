import { GoogleGenAI } from "@google/genai";
import { Message, Role, LessonPlan, AnalysisResult, LessonInput } from "../types";
import { SYSTEM_INSTRUCTION, LESSON_PLAN_INSTRUCTION } from "../constants";

// Initialize Gemini Client — prioritize user-provided key from localStorage
const getClient = () => {
  let userApiKey: string | null = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      userApiKey = localStorage.getItem('gemini_api_key');
    }
  } catch (e) {
    console.warn('Cannot access localStorage:', e);
  }

  const apiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';

  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY' || apiKey.trim() === '') {
    throw new Error("Vui lòng nhập API Key. Nhấn nút 'Cấu hình API Key' ở thanh tiêu đề.");
  }

  return new GoogleGenAI({ apiKey });
};

const MODEL_ID = "gemini-2.0-flash";
const MAX_RETRIES = 3;

// Helper: sleep for a duration
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: check if error is a rate limit (429) error
const isRateLimitError = (error: any): boolean => {
  const msg = error?.message || error?.toString() || '';
  return msg.includes('429') || msg.includes('quota') || msg.includes('rate') ||
    msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Too Many Requests');
};

// Helper: format user-friendly error message
const formatError = (error: any): Error => {
  const msg = error?.message || error?.toString() || '';
  if (msg.includes('API key') || msg.includes('API_KEY_INVALID') || msg.includes('401')) {
    return new Error("API Key không hợp lệ. Vui lòng kiểm tra lại API Key trong phần Cấu hình.");
  }
  if (isRateLimitError(error)) {
    return new Error("Đã vượt giới hạn API. Vui lòng đợi 30–60 giây rồi thử lại, hoặc kiểm tra quota tại Google AI Studio.");
  }
  if (msg.includes('not found') || msg.includes('404')) {
    return new Error("Model AI không khả dụng. Vui lòng thử lại sau.");
  }
  if (msg.includes('CORS') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return new Error("Lỗi kết nối mạng. Kiểm tra internet và thử lại.");
  }
  return new Error("Lỗi AI: " + (msg || "Không xác định"));
};

export const streamResponse = async (
  currentHistory: Message[],
  _newMessage: string,
  _base64Image?: string
): Promise<AsyncGenerator<string, void, unknown>> => {
  const ai = getClient();

  const contents = currentHistory
    .filter(msg => !msg.isError && (msg.text.trim() !== '' || msg.image))
    .map((msg) => {
      if (msg.role === Role.USER && msg.image) {
        return {
          role: 'user' as const,
          parts: [
            { text: msg.text || 'Hãy mô tả và giải bài toán trong ảnh này.' },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: msg.image.split(',')[1]
              }
            }
          ]
        };
      }
      return {
        role: (msg.role === Role.USER ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: msg.text }],
      };
    });

  // Retry loop with exponential backoff for rate limit errors
  let lastError: any = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const waitTime = Math.min(2000 * Math.pow(2, attempt), 15000); // 4s, 8s, 15s
        console.log(`Retry attempt ${attempt + 1}/${MAX_RETRIES}, waiting ${waitTime}ms...`);
        await sleep(waitTime);
      }

      const response = await ai.models.generateContentStream({
        model: MODEL_ID,
        contents: contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      });

      async function* generator() {
        for await (const chunk of response) {
          const text = chunk.text;
          if (text) {
            yield text;
          }
        }
      }

      return generator();

    } catch (error: any) {
      console.error(`Gemini API Error (attempt ${attempt + 1}):`, error);
      lastError = error;

      // Only retry on rate limit errors
      if (!isRateLimitError(error) || attempt === MAX_RETRIES - 1) {
        throw formatError(error);
      }
      // Otherwise continue to next retry attempt
    }
  }

  throw formatError(lastError);
};

export const generateLessonPlan = async (input: LessonInput): Promise<{ analysis: AnalysisResult, lessonPlan: LessonPlan }> => {
  const ai = getClient();

  const topicText = input.topic?.trim() || `Bài học ${input.subject || 'Toán'} ${input.grade}`;

  const prompt = `
  Hãy soạn giáo án cho chủ đề: "${topicText}"
  Môn: ${input.subject || 'Toán'}
  Lớp: ${input.grade}
  Thời lượng: ${input.duration || '45 phút'}
  Yêu cầu cần đạt đầu vào: "${input.objectives || 'Theo chuẩn kiến thức kỹ năng của Bộ GD&ĐT'}"
  `;

  // Retry loop with exponential backoff
  let lastError: any = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const waitTime = Math.min(2000 * Math.pow(2, attempt), 15000);
        console.log(`Lesson plan retry ${attempt + 1}/${MAX_RETRIES}, waiting ${waitTime}ms...`);
        await sleep(waitTime);
      }

      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        config: {
          systemInstruction: LESSON_PLAN_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.5,
        }
      });

      const text = response.text;
      if (!text) throw new Error("Không nhận được phản hồi từ AI");

      const jsonString = text.replace(/```json\n|\n```/g, "").trim();
      return JSON.parse(jsonString);

    } catch (error: any) {
      console.error(`Lesson Plan Error (attempt ${attempt + 1}):`, error);
      lastError = error;

      if (!isRateLimitError(error) || attempt === MAX_RETRIES - 1) {
        throw formatError(error);
      }
    }
  }

  throw formatError(lastError);
};
