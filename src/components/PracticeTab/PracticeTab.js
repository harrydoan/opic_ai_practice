import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Question from './Question';
import Feedback from './Feedback';
import Button from '../common/Button';
import './PracticeTab.css';

// ========================================================================
// == PROMPT MỚI: YÊU CẦU AI TRẢ VỀ JSON, ĐÁNG TIN CẬY 100% ==
// ========================================================================
const createQuestionPrompt = (sentence) => {
  return `Given the sentence: "${sentence}".
Your task is to create a challenging fill-in-the-blank question.
1. Analyze the sentence and choose a single, meaningful word to be the blanked-out answer.
2. Create three incorrect but plausible distractor words of the same grammatical type.
3. Provide a concise grammar explanation in Vietnamese.
4. Provide the full Vietnamese translation of the sentence.

Return the result ONLY as a single, raw JSON object with the following structure. Do not include any extra text, markdown formatting like \`\`\`json, or explanations outside of the JSON object itself.
{
  "question_sentence": "The sentence with '_____' in place of the correct word.",
  "options": ["correct_word", "distractor1", "distractor2", "distractor3"],
  "correct_answer": "the_correct_word_in_lowercase",
  "grammar_explanation": "Your Vietnamese grammar explanation here.",
  "translation": "Your Vietnamese translation here."
}`;
};

// ========================================================================
// == HÀM PHÂN TÍCH MỚI: Chỉ tìm và parse JSON, rất ổn định ==
// ========================================================================
const parseAIResponse = (rawText) => {
  try {
    // Tìm khối JSON đầu tiên trong chuỗi trả về
    const jsonMatch = rawText.match(/{[\s\S]*}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("JSON parsing error:", error);
    return null;
  }
};


const PracticeTab = () => {
  const { sentenceData, selectedModel } = useContext(AppContext);
  
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [error, setError] = useState(null);

  const fetchAndProcessQuestion = useCallback(async (retryCount = 3) => {
    if (sentenceData.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsAnswered(false);
    setError(null);
    
    try {
      const randomIndex = Math.floor(Math.random() * sentenceData.length);
      const sentenceObject = sentenceData[randomIndex];
      const originalSentence = sentenceObject.originalText;

      const prompt = createQuestionPrompt(originalSentence);
      const rawResponse = await callOpenRouterAPI(prompt, selectedModel);
      
      const questionData = parseAIResponse(rawResponse);
      
      if (questionData && questionData.options && questionData.correct_answer) {
        // Tự sửa lỗi và xáo trộn đáp án
        const correctAnswerLower = questionData.correct_answer.toLowerCase();
        if (!questionData.options.map(o => o.toLowerCase()).includes(correctAnswerLower)) {
            questionData.options[0] = questionData.correct_answer;
        }
        questionData.options = questionData.options.sort(() => Math.random() - 0.5);
        
        setCurrentQuestion(questionData);
      } else {
        throw new Error("AI response was not in the correct JSON format.");
      }

    } catch (err) {
      console.error(`Error fetching/parsing question (attempt ${4 - retryCount}):`, err);
      if (retryCount > 1) {
        // Nếu lỗi, tự động thử lại với một câu khác
        fetchAndProcessQuestion(retryCount - 1);
      } else {
        setError("AI is not responding correctly. Please try again later.");
        setIsLoading(false);
      }
    } finally {
      // Chỉ tắt loading nếu không có retry
      if (retryCount <= 1) {
        setIsLoading(false);
      }
    }
  }, [sentenceData, selectedModel]);

  useEffect(() => {
    fetchAndProcessQuestion();
  }, [fetchAndProcessQuestion]);

  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedAnswer(answer);
  };
  
  const handleNextQuestion = () => {
    fetchAndProcessQuestion();
  };
  
  if (isLoading) {
    return (
      <div className="processing-container">
        <div className="spinner"></div>
        <h4>AI is generating the next question...</h4>
      </div>
    );
  }

  if (error) {
    return (
        <div className="processing-container">
            <p>Rất tiếc, đã có lỗi xảy ra.</p>
            <p><i>{error}</i></p>
            <Button onClick={handleNextQuestion}>Thử lại</Button>
        </div>
    );
  }
  
  if (!currentQuestion) {
    return <p>Không có câu hỏi nào để hiển thị. Vui lòng kiểm tra lại tab 'Nhập liệu'.</p>;
  }
  
  return (
    <div className="practice-tab-container">
      <Question 
        question={{
            question: currentQuestion.question_sentence,
            options: currentQuestion.options,
            correctAnswer: currentQuestion.correct_answer,
        }}
        onAnswerSelect={handleAnswerSelect}
        selectedAnswer={selectedAnswer}
        isAnswered={isAnswered}
      />
      {isAnswered && (
        <div className="feedback-and-next">
          <Feedback 
            isCorrect={selectedAnswer.toLowerCase() === currentQuestion.correct_answer.toLowerCase()}
            question={{
                explanation: `Đáp án đúng là "${currentQuestion.correct_answer}".`,
                grammar: currentQuestion.grammar_explanation,
                translation: currentQuestion.translation,
            }}
            isLoading={false}
          />
          <Button onClick={handleNextQuestion}>
            Next Question →
          </Button>
        </div>
      )}
    </div>
  );
};

export default PracticeTab;