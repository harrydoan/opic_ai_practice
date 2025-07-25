const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Batch translate sentences: returns array of {original, translation}
export const batchTranslateSentences = async (sentences, model = MODEL, options = {}) => {
  try {
    const prompt = `Hãy dịch các câu sau sang tiếng Việt. Trả về một mảng JSON, mỗi phần tử là một object có trường 'original' (câu tiếng Anh) và 'translation' (bản dịch tiếng Việt). Các câu:\n${sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    const res = await callOpenRouterAPI(prompt, model, { max_tokens: 2000, ...options });
    const arr = JSON.parse(res.match(/\[.*\]/s)[0]);
    return arr;
  } catch (error) {
    console.error("Error in batchTranslateSentences:", error);
    return [];
  }
};
// Lưu ý: Không thể dùng process.env trên frontend trực tiếp như backend Node.js. Hãy truyền API key qua biến môi trường build (ví dụ: Vite, CRA sẽ tự inject REACT_APP_*) hoặc window.ENV nếu cần.
const MODEL = 'openai/gpt-4.1-nano';

export const callOpenRouterAPI = async (prompt, model = MODEL, options = {}) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REACT_APP_OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: options.max_tokens || 1000
      })
    });

    if (!response.ok) {
      let errorMsg = `API call failed with status: ${response.status}`;
      let errorBody = await response.text();
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.error && errorJson.error.message) {
          errorMsg += ` | Message: ${errorJson.error.message}`;
        }
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling OpenRouter API:", error);
    // Trả về object lỗi để phía giao diện xử lý
    return { error: true, message: error.message };
  }
};