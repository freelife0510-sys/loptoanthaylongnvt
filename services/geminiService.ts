import { GoogleGenAI } from "@google/genai";
import { Message, Role, LessonPlan, AnalysisResult, LessonInput } from "../types";
import { SYSTEM_INSTRUCTION, LESSON_PLAN_INSTRUCTION } from "../constants";

// ============================================================
// Model Fallback Chain (same strategy as reference app)
// When one model hits rate limit/overload, automatically try next
// ============================================================

const MODEL_CHAIN = [
  "gemini-3-flash-preview", // Newest, best accuracy, highest rate limits
  "gemini-2.5-flash",       // Fallback stable
  "gemini-2.0-flash",       // Last resort fallback
];

// ============================================================
// API Key Management
// ============================================================

const getApiKey = (): string => {
  let userApiKey: string | null = null;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Check multi-key format first
      const multiKeys = localStorage.getItem('gemini_api_keys');
      if (multiKeys) {
        try {
          const parsed = JSON.parse(multiKeys);
          if (Array.isArray(parsed) && parsed.length > 0) {
            userApiKey = parsed[0].trim();
          }
        } catch {
          const first = multiKeys.split('\n').find(k => k.trim());
          if (first) userApiKey = first.trim();
        }
      }

      // Fallback to single key
      if (!userApiKey) {
        userApiKey = localStorage.getItem('gemini_api_key');
      }
    }
  } catch (e) {
    console.warn('Cannot access localStorage:', e);
  }

  const apiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';

  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY' || apiKey.trim() === '') {
    throw new Error("Vui lòng nhập API Key. Nhấn nút 'Cấu hình API Key' ở thanh tiêu đề.");
  }

  return apiKey;
};

// ============================================================
// Helpers
// ============================================================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (error: any): boolean => {
  const msg = error?.message || error?.toString() || '';
  return msg.includes('429') || msg.includes('quota') || msg.includes('rate') ||
    msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Too Many Requests') ||
    msg.includes('503') || msg.includes('overloaded') || msg.includes('UNAVAILABLE');
};

const formatError = (error: any): Error => {
  const msg = error?.message || error?.toString() || '';

  if (msg.includes('API key') || msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('API key not valid')) {
    return new Error("API Key không hợp lệ. Vui lòng kiểm tra lại API Key trong phần Cấu hình.");
  }
  if (msg.includes('403')) {
    return new Error("API Key bị từ chối (403). Vui lòng kiểm tra API Key hoặc thử tạo key mới tại Google AI Studio.");
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('rate') || msg.includes('Too Many Requests')) {
    return new Error("Đã vượt giới hạn API. Vui lòng đợi 1-2 phút rồi thử lại.");
  }
  if (msg.includes('503') || msg.includes('overloaded') || msg.includes('UNAVAILABLE')) {
    return new Error("Server AI đang quá tải. Vui lòng thử lại sau ít giây.");
  }
  if (msg.includes('not found') || msg.includes('404')) {
    return new Error("Model AI không khả dụng. Vui lòng thử lại sau.");
  }
  if (msg.includes('CORS') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return new Error("Lỗi kết nối mạng. Kiểm tra internet và thử lại.");
  }
  return new Error("Lỗi AI: " + (msg || "Không xác định"));
};

/**
 * Parse error message — some errors come as JSON strings
 */
const parseErrorMessage = (error: any): string => {
  let msg = error?.message || error?.toString() || '';
  if (typeof msg === 'string' && msg.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.error && parsed.error.message) {
        msg = parsed.error.message;
      }
    } catch { /* ignore */ }
  }
  error.message = msg;
  return msg;
};

// ============================================================
// Core: Model Fallback with Auto-Switch
// Same pattern as the reference app — try each model,
// if it fails with 429/503/overloaded, switch to next model
// ============================================================

export const streamResponse = async (
  currentHistory: Message[],
  _newMessage: string,
  _base64Image?: string
): Promise<AsyncGenerator<string, void, unknown>> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

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

  let lastError: any = null;

  // Try each model in the chain
  for (let i = 0; i < MODEL_CHAIN.length; i++) {
    const modelId = MODEL_CHAIN[i];
    console.log(`Attempting generation with model: ${modelId}...`);

    try {
      const response = await ai.models.generateContentStream({
        model: modelId,
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
      const msg = parseErrorMessage(error);
      console.error(`Error with model ${modelId}:`, error);
      lastError = error;

      // If it's a retryable error (429, 503, overloaded) AND there are more models
      if (isRetryableError(error) && i < MODEL_CHAIN.length - 1) {
        console.warn(`Model ${modelId} failed/overloaded. Switching to fallback model...`);
        continue;
      }

      // If API key is invalid, fail immediately
      if (msg.includes('403') || msg.includes('API key not valid') || msg.includes('API_KEY_INVALID') || msg.includes('401')) {
        throw formatError(error);
      }

      // For other errors, try next model if available
      if (i < MODEL_CHAIN.length - 1) {
        console.warn(`Model ${modelId} encountered error. Switching to fallback model...`);
        continue;
      }
    }
  }

  throw formatError(lastError || new Error("Tất cả các model đều thất bại. Vui lòng thử lại sau."));
};

export const generateLessonPlan = async (input: LessonInput): Promise<{ analysis: AnalysisResult, lessonPlan: LessonPlan }> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const topicText = input.topic?.trim() || `Bài học ${input.subject || 'Toán'} ${input.grade}`;

  const prompt = `
  Hãy soạn giáo án cho chủ đề: "${topicText}"
  Môn: ${input.subject || 'Toán'}
  Lớp: ${input.grade}
  Thời lượng: ${input.duration || '45 phút'}
  Yêu cầu cần đạt đầu vào: "${input.objectives || 'Theo chuẩn kiến thức kỹ năng của Bộ GD&ĐT'}"
  `;

  let lastError: any = null;

  // Try each model in the chain
  for (let i = 0; i < MODEL_CHAIN.length; i++) {
    const modelId = MODEL_CHAIN[i];
    console.log(`Lesson plan: attempting with model ${modelId}...`);

    try {
      const response = await ai.models.generateContent({
        model: modelId,
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
      if (!text) throw new Error("API trả về kết quả rỗng (Empty Response).");

      const jsonString = text.replace(/```json\n|\n```/g, "").trim();
      return JSON.parse(jsonString);

    } catch (error: any) {
      const msg = parseErrorMessage(error);
      console.error(`Lesson Plan Error with model ${modelId}:`, error);
      lastError = error;

      // Retryable → try next model
      if (isRetryableError(error) && i < MODEL_CHAIN.length - 1) {
        console.warn(`Model ${modelId} failed/overloaded. Switching to fallback model...`);
        continue;
      }

      // API key invalid → fail immediately
      if (msg.includes('403') || msg.includes('API key not valid') || msg.includes('API_KEY_INVALID') || msg.includes('401')) {
        throw formatError(error);
      }

      // Other error → try next model if available
      if (i < MODEL_CHAIN.length - 1) {
        console.warn(`Model ${modelId} encountered error. Switching to fallback model...`);
        continue;
      }
    }
  }

  throw formatError(lastError || new Error("Tất cả các model đều thất bại. Vui lòng thử lại sau."));
};
