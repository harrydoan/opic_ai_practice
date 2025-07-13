import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Question from './Question';
import Feedback from './Feedback';
import Button from '../common/Button';
import './PracticeTab.css';

const createQuestionPrompt = (sentence) => {
  return `Given the English sentence: "${sentence}".
Your task is to create a challenging fill-in-the-blank question for an English learner.
1. Analyze the sentence and choose a single, meaningful word to be the blanked-out answer. The word must be at least 3 characters long.
2. Create three incorrect but plausible distractor words. They should be the same grammatical type as the correct answer.
3. Provide a concise grammar explanation in Vietnamese for why the correct word is the right choice in this context.
4. Provide the full Vietnamese translation of the sentence.

Return the result ONLY as a single, raw JSON object with the following structure. Do not include any extra text or markdown formatting.
{
  "question_sentence": "The sentence with '_____' in place of the correct word.",
  "options": ["correct_word", "distractor1", "distractor2", "distractor3"],
  "correct_answer": "the_correct_word_in_lowercase",
  "grammar_explanation": "Your Vietnamese grammar explanation here.",
  "translation": "Your Vietnamese translation here."
}`;
};

const PracticeTab = () => {
  const { sentences, selectedModel } = useContext(AppContext);
  
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const pickAndProcessNextQuestion = useCallback(async () => {
    if (sentences.length === 0) return;

    setIsLoading(true);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setCurrentQuestion(null);

    try {
      const randomIndex = Math.floor(Math.random() * sentences.length);
      const sentenceToProcess = sentences[randomIndex];
      const prompt = createQuestionPrompt(sentenceToProcess);
      const result = await callOpenRouterAPI(prompt, selectedModel);
      
      const jsonString = result.match(/{[\s\S]*}/);
      if (jsonString) {
        let questionData = JSON.parse(jsonString[0]);

        // =================================================================
        // == BƯỚC KIỂM TRA VÀ TỰ SỬA LỖI (SELF-CORRECTION LOGIC) ==
        // =================================================================
        // Đảm bảo các giá trị cần thiết tồn tại
        if (!questionData.options || !questionData.correct_answer) {
          throw new Error("AI response is missing 'options' or 'correct_answer'.");
        }

        const correctAnswerLower = questionData.correct_answer.toLowerCase();
        const optionsLower = questionData.options.map(opt => opt.toLowerCase());

        // Kiểm tra xem câu trả lời đúng có trong các lựa chọn không
        if (!optionsLower.includes(correctAnswerLower)) {
          console.warn("AI Error: Correct answer was not in options. Forcing it in.");
          // Thay thế lựa chọn đầu tiên bằng câu trả lời đúng để đảm bảo nó tồn tại
          questionData.options[0] = questionData.correct_answer;
        }
        
        // Luôn xáo trộn các đáp án sau khi đã đảm bảo câu trả lời đúng có trong đó
        questionData.options = questionData.options.sort(() => Math.random() - 0.5);
        // =================================================================
        
        setCurrentQuestion(questionData);
      } else {
        throw new Error("Failed to parse JSON from AI response.");
      }
    } catch (error) {
      console.error("Failed to generate next question:", error);
      // Nếu có lỗi, thử lại với câu hỏi khác
      pickAndProcessNextQuestion();
    } finally {
      setIsLoading(false);
    }
  }, [sentences, selectedModel]);

  useEffect(() => {
    pickAndProcessNextQuestion();
  }, [pickAndProcessNextQuestion]);

  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedAnswer(answer);
  };
  
  const handleNextQuestion = () => {
    pickAndProcessNextQuestion();
  };
  
  if (isLoading) {
    return (
        <div className="processing-container">
            <div className="spinner"></div>
            <h4>AI is generating the next question...</h4>
        </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="processing-container">
        <p>Could not load a question.</p>
        <Button onClick={handleNextQuestion}>Try Again</Button>
      </div>
    );
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