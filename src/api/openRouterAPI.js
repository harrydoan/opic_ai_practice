const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.REACT_APP_OPENROUTER_API_KEY;
const MODEL = 'openai/gpt-4o-mini';

export const callOpenRouterAPI = async (prompt, model = MODEL, options = {}) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
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