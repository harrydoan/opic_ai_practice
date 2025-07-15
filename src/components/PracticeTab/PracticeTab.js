import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Question from './Question';
import Feedback from './Feedback';
import Button from '../common/Button';
import './PracticeTab.css';

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
// == HÀM PHÂN TÍCH MỚI, CÓ KHẢ NĂNG XỬ LÝ MARKDOWN ==
// ========================================================================
const parseAIResponse = (rawText) => {
  try {
    let textToParse = rawText;

    // Cố gắng tìm và trích xuất nội dung từ khối mã markdown (```json ... ```)
    const markdownMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      textToParse = markdownMatch[1];
    }

    // Tìm khối JSON đầu tiên trong chuỗi đã được xử lý
    const jsonMatch = textToParse.match(/{[\s\S]*}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    console.error("Parser failed: No valid JSON object found in AI response.", rawText);
    return null;
  } catch (error) {
    console.error("JSON parsing error:", error, "Raw text:", rawText);
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
      
      const prompt = createQuestionPrompt(sentenceObject.originalText);
      const rawResponse = await callOpenRouterAPI(prompt, selectedModel);
      
      const questionData = parseAIResponse(rawResponse);
      
      if (questionData && questionData.options && questionData.correct_answer) {
        const correctAnswerLower = questionData.correct_answer.toLowerCase();
        if (!questionData.options.map(o => o.toLowerCase()).includes(correctAnswerLower)) {
            questionData.options[0] = questionData.correct_answer;
        }
        questionData.options = questionData.options.sort(() => Math.random() - 0.5);
        
        setCurrentQuestion(questionData);
      } else {
        throw new Error("AI did not return valid JSON, even after parsing.");
      }

    } catch (err) {
      console.error(`Error fetching/parsing question (attempt ${4 - retryCount}):`, err);
      if (retryCount > 1) {
        // Tự động thử lại với một câu khác nếu có lỗi
        setTimeout(() => fetchAndProcessQuestion(retryCount - 1), 500);
      } else {
        setError("AI is not responding correctly. Please try again later.");
        setIsLoading(false);
      }
    } finally {
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
        <h4>AI is generating question...</h4>
      </div>
    );
  }

  if (error) {
    return (
        <div className="processing-container">
            <p>An error occurred:</p>
            <p><i>{error}</i></p>
            <Button onClick={handleNextQuestion}>Try Again</Button>
        </div>
    );
  }
  
  if (!currentQuestion) {
    return <p>No questions to display. Please check the 'Input' tab.</p>;
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