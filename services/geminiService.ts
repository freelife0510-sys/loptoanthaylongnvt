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

export const streamResponse = async (
  currentHistory: Message[],
  _newMessage: string,
  _base64Image?: string
): Promise<AsyncGenerator<string, void, unknown>> => {
  const ai = getClient();

  // currentHistory already contains the new user message appended by App.tsx,
  // so we just convert the full history — no need to push again.
  const contents = currentHistory
    .filter(msg => !msg.isError && msg.text.trim() !== '')
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

  try {
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
    console.error("Gemini API Error:", error);
    // Provide more descriptive errors
    if (error?.message?.includes('API key')) {
      throw new Error("API Key không hợp lệ. Vui lòng kiểm tra lại API Key trong phần Cấu hình.");
    }
    if (error?.message?.includes('quota') || error?.message?.includes('429')) {
      throw new Error("Đã vượt giới hạn API. Vui lòng đợi một chút rồi thử lại.");
    }
    if (error?.message?.includes('not found') || error?.message?.includes('404')) {
      throw new Error("Model AI không khả dụng. Vui lòng thử lại sau.");
    }
    throw new Error("Lỗi kết nối AI: " + (error?.message || "Không xác định. Kiểm tra API Key và kết nối mạng."));
  }
};

export const generateLessonPlan = async (input: LessonInput): Promise<{ analysis: AnalysisResult, lessonPlan: LessonPlan }> => {
  const ai = getClient();

  const prompt = `
  Hãy soạn giáo án cho chủ đề: "${input.topic}"
  Môn: ${input.subject || 'Toán'}
  Lớp: ${input.grade}
  Thời lượng: ${input.duration}
  Yêu cầu cần đạt đầu vào: "${input.objectives}"
  `;

  try {
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

    // Parse the JSON response
    const text = response.text;
    if (!text) throw new Error("Không nhận được phản hồi từ AI");

    // Clean up potential markdown formatting if the model adds it despite instructions
    const jsonString = text.replace(/```json\n|\n```/g, "").trim();

    return JSON.parse(jsonString);

  } catch (error: any) {
    console.error("Lesson Plan Generation Error:", error);
    if (error?.message?.includes('API key')) {
      throw new Error("API Key không hợp lệ. Vui lòng kiểm tra lại trong phần Cấu hình API Key.");
    }
    throw new Error("Lỗi tạo giáo án: " + (error?.message || "Không xác định"));
  }
};
