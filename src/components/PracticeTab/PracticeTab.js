import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Feedback from './Feedback';
import Button from '../common/Button';
import './PracticeTab.css';

const promptMap = {
  1: (sentence) => `Given the sentence: "${sentence}"
1. Randomly hide one word from the sentence using a blank (____).
2. Provide six multiple choice options labeled A–F, in which exactly one is the correct word to fill in the blank. The other five must be plausible but incorrect.
3. Explain the grammar of the hidden word in Vietnamese (including its part of speech, role in the sentence, and position).
4. Translate the full original sentence into Vietnamese.
Only output these four parts and nothing else.`,
  2: (sentence) => `Given the sentence: "${sentence}"
1. Randomly hide two different words from the sentence using blanks (____).
2. Provide six multiple choice options labeled A–F, in which exactly two are the correct words to fill in the blanks. The other four must be plausible but incorrect.
3. Choose one of the hidden words and explain its grammar in Vietnamese (including its part of speech, role in the sentence, and position).
4. Translate the full original sentence into Vietnamese.
Only output these four parts and nothing else.`,
  3: (sentence) => `Given the sentence: "${sentence}"
1. Randomly hide three different words from the sentence using blanks (____). Do not hide the same combination of words every time the prompt is run.
2. Provide six multiple choice options labeled A–F, in which exactly three are the correct words to fill in the blanks. The other three must be plausible but incorrect.
3. Choose one of the hidden words and explain its grammar in Vietnamese (including its part of speech, role in the sentence, and position).
4. Translate the full original sentence into Vietnamese.
Only output these four parts and nothing else.`
};

const parseAIResponse = (rawText, numBlanks) => {
  try {
    let textToParse = rawText;
    const markdownMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      textToParse = markdownMatch[1];
    }
    // Parse custom format (not JSON)
    // Expect: question_sentence, options, correct_answers, grammar_explanation, translation
    const questionSentenceMatch = textToParse.match(/Sentence with blanks:[\\s\\S]*?([^\n]+)\n/);
    const optionsMatch = textToParse.match(/Multiple choice options:[\\s\\S]*?([A-F].*?)(?:\\n\\n|\\nCorrect answers:)/s);
    const correctAnswersMatch = textToParse.match(/Correct answers?:[\\s\\S]*?([A-F].*?)(?:\\n|$)/);
    const grammarMatch = textToParse.match(/Grammar explanation \\(word:.*?\\):\\n([\\s\\S]*?)\\nTranslation:/);
    const translationMatch = textToParse.match(/Translation:[\\s\\S]*?([^\n]+)/);

    // Parse options
    let options = [];
    if (optionsMatch && optionsMatch[1]) {
      options = optionsMatch[1].split('\n').map(line => {
        const m = line.match(/^[A-F]\\.\\s*(.*)$/);
        return m ? m[1].trim() : null;
      }).filter(Boolean);
    }
    // Parse correct answers
    let correctAnswers = [];
    if (correctAnswersMatch && correctAnswersMatch[1]) {
      correctAnswers = correctAnswersMatch[1].split(',').map(ans => {
        // e.g. "A. I" => "I"
        const m = ans.match(/[A-F]\\.\\s*(.*)/);
        return m ? m[1].trim() : ans.trim();
      });
    }

    return {
      question_sentence: questionSentenceMatch ? questionSentenceMatch[1].trim() : '',
      options,
      correct_answers: correctAnswers,
      grammar_explanation: grammarMatch ? grammarMatch[1].trim() : '',
      translation: translationMatch ? translationMatch[1].trim() : ''
    };
  } catch (error) {
    return null;
  }
};

const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

const PracticeTab = () => {
  const { sentenceData, selectedModel } = useContext(AppContext);

  const [numBlanks, setNumBlanks] = useState(1);
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sentenceData.length > 0) {
      setDeck(shuffleArray(Array.from(Array(sentenceData.length).keys())));
      setCurrentIndex(0);
    }
  }, [sentenceData]);

  const pickRandomIndex = (deckArr) => {
    if (!deckArr || deckArr.length === 0) return null;
    const randomIdx = Math.floor(Math.random() * deckArr.length);
    return deckArr[randomIdx];
  };

  useEffect(() => {
    const fetchQuestion = async () => {
      setIsLoading(true);
      setIsAnswered(false);
      setSelectedAnswers([]);
      setError(null);

      if (!deck.length) {
        const newDeck = shuffleArray(Array.from(Array(sentenceData.length).keys()));
        setDeck(newDeck);
        setCurrentIndex(0);
        setIsLoading(false);
        return;
      }

      const sentenceIdx = typeof currentIndex === 'number' ? deck[currentIndex] : pickRandomIndex(deck);
      const sentenceObject = sentenceData[sentenceIdx];
      if (!sentenceObject) {
        setError("Không tìm thấy câu hỏi.");
        setIsLoading(false);
        return;
      }

      try {
        const prompt = promptMap[numBlanks](sentenceObject.originalText);
        const rawResponse = await callOpenRouterAPI(prompt, selectedModel);
        const questionData = parseAIResponse(rawResponse, numBlanks);

        if (questionData && questionData.options && questionData.correct_answers) {
          setCurrentQuestion(questionData);
        } else {
          throw new Error("AI không trả về dữ liệu hợp lệ.");
        }
      } catch (err) {
        setError("AI không phản hồi đúng. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    };

    if (sentenceData.length > 0 && deck.length > 0 && (typeof currentIndex === 'number')) {
      fetchQuestion();
    }
  }, [currentIndex, deck, sentenceData, selectedModel, numBlanks]);

  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    let newSelected = selectedAnswers.includes(answer)
      ? selectedAnswers.filter(a => a !== answer)
      : [...selectedAnswers, answer];
    setSelectedAnswers(newSelected);
  };

  const handleSubmitAnswers = () => {
    setIsAnswered(true);
  };

  const handleNextQuestion = () => {
    if (deck.length <= 1) {
      setDeck(shuffleArray(Array.from(Array(sentenceData.length).keys())));
      setCurrentIndex(0);
    } else {
      const newDeck = deck.filter((_, idx) => idx !== currentIndex);
      const nextIdx = pickRandomIndex(newDeck);
      setDeck(newDeck);
      setCurrentIndex(newDeck.indexOf(nextIdx));
    }
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

  // UI chọn số từ che
  const blanksSelector = (
    <div style={{ marginBottom: 16 }}>
      <label>Chọn số từ che: </label>
      {[1,2,3].map(n => (
        <Button
          key={n}
          onClick={() => setNumBlanks(n)}
          className={numBlanks === n ? 'selected' : ''}
          style={{ margin: '0 8px' }}
        >
          {n} từ
        </Button>
      ))}
    </div>
  );

  // Hiển thị đáp án, cho phép chọn nhiều đáp án
  return (
    <div className="practice-tab-container">
      {blanksSelector}
      <div className="practice-question" style={{ marginBottom: 16 }}>
        <strong>{currentQuestion.question_sentence}</strong>
      </div>
      <div className="practice-options" style={{ marginBottom: 16 }}>
        {currentQuestion.options.map((option, idx) => (
          <Button
            key={option}
            className={
              isAnswered
                ? currentQuestion.correct_answers.includes(option)
                  ? 'practice-btn correct'
                  : selectedAnswers.includes(option)
                  ? 'practice-btn incorrect'
                  : 'practice-btn disabled'
                : selectedAnswers.includes(option)
                ? 'practice-btn selected'
                : 'practice-btn'
            }
            onClick={() => handleAnswerSelect(option)}
            disabled={isAnswered}
            style={{ minWidth: 64, margin: '8px', borderRadius: 12 }}
          >
            {String.fromCharCode(65 + idx)}. {option}
          </Button>
        ))}
      </div>
      {!isAnswered && (
        <Button
          onClick={handleSubmitAnswers}
          disabled={selectedAnswers.length !== numBlanks}
        >
          Kiểm tra đáp án
        </Button>
      )}
      {isAnswered && (
        <div className="feedback-and-next">
          <Feedback
            isCorrect={
              selectedAnswers.length === currentQuestion.correct_answers.length &&
              selectedAnswers.every(ans => currentQuestion.correct_answers.includes(ans))
            }
            question={{
              explanation: `Đáp án đúng: ${currentQuestion.correct_answers.join(', ')}`,
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