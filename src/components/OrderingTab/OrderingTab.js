import React, { useState, useContext, useEffect, useCallback } from 'react';
import { speakText } from '../../utils/speech';
import { AppContext } from '../../context/AppContext';
import Button from '../common/Button';
import './OrderingTab.css';

const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

const OrderingTab = () => {
    const { sentenceData, setActiveTab } = useContext(AppContext);

    // Bộ bài chỉ số câu, lặp lại vô hạn
    const [deck, setDeck] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    // State cho giao diện
    const [selectedAnswer, setSelectedAnswer] = useState(null);

    // Khởi tạo bộ bài ngẫu nhiên khi có dữ liệu
    useEffect(() => {
        if (sentenceData.length > 0) {
            setDeck(shuffleArray(Array.from(Array(sentenceData.length).keys())));
            setCurrentIndex(0);
        }
    }, [sentenceData]);

    // Sinh lựa chọn đáp án cho mỗi câu
    const generateOptions = useCallback(() => {
        if (deck.length === 0) return [];
        const correctPosition = deck[currentIndex] + 1;
        let wrongPositions = [];
        while (wrongPositions.length < 3) {
            const randomPos = Math.floor(Math.random() * sentenceData.length) + 1;
            if (randomPos !== correctPosition && !wrongPositions.includes(randomPos)) {
                wrongPositions.push(randomPos);
            }
        }
        return shuffleArray([correctPosition, ...wrongPositions]);
    }, [deck, currentIndex, sentenceData.length]);

    const [options, setOptions] = useState([]);
    useEffect(() => {
        setOptions(generateOptions());
    }, [generateOptions]);

    const handleAnswerSelect = (position) => {
        if (isAnswered) return;
        setSelectedAnswer(position);
        setIsAnswered(true);
    };

    const handleNextQuestion = () => {
        // Nếu hết bộ bài, xáo lại và bắt đầu vòng mới
        if (deck.length <= 1) {
            setDeck(shuffleArray(Array.from(Array(sentenceData.length).keys())));
            setCurrentIndex(0);
        } else {
            const newDeck = deck.filter((_, idx) => idx !== currentIndex);
            const nextIdx = Math.floor(Math.random() * newDeck.length);
            setDeck(newDeck);
            setCurrentIndex(nextIdx);
        }
        setIsAnswered(false);
        setSelectedAnswer(null);
    };

    if (sentenceData.length === 0) {
        return <div className="ordering-tab-container"><p>Không có dữ liệu. Vui lòng xử lý văn bản ở tab "Nhập liệu".</p></div>;
    }

    const currentSentence = sentenceData[deck[currentIndex]]?.originalText;
    const correctPosition = deck[currentIndex] + 1;

    return (
        <div className="ordering-tab-container">
            <div className="ordering-card">
                <div className="ordering-progress">
                    <span style={{ color: "#4facfe", fontWeight: "bold" }}>Sắp xếp câu</span>
                </div>
                <h3>❓ Câu này ở vị trí thứ mấy trong đoạn văn?</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div className="ordering-sentence">{currentSentence}</div>
                  <button
                    aria-label="Nghe câu"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    onClick={() => speakText(currentSentence)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="#4facfe"/>
                      <path d="M16.5 12c0-1.77-.77-3.29-2-4.29v8.58c1.23-1 2-2.52 2-4.29z" fill="#4facfe"/>
                      <path d="M14.5 3.97v2.06c3.39.49 6 3.39 6 6.97s-2.61 6.48-6 6.97v2.06c4.01-.51 7-3.86 7-9.03s-2.99-8.52-7-9.03z" fill="#4facfe"/>
                    </svg>
                  </button>
                </div>
                <div className="ordering-options-grid">
                    {options.map(option => {
                        let btnClass = 'answer-btn';
                        if (isAnswered) {
                            if (option === correctPosition) btnClass += ' correct';
                            else if (option === selectedAnswer) btnClass += ' incorrect';
                            else btnClass += ' disabled';
                        } else if (option === selectedAnswer) {
                            btnClass += ' selected';
                        }
                        return (
                            <button
                                key={option}
                                className={btnClass}
                                onClick={() => handleAnswerSelect(option)}
                                disabled={isAnswered}
                                style={{ minWidth: 64, margin: '8px', borderRadius: 12 }}
                            >
                                Vị trí {option}
                            </button>
                        );
                    })}
                </div>
                {isAnswered && (
                    <div className={`ordering-feedback ${selectedAnswer === correctPosition ? 'success' : 'error'}`}>
                        <h4>{selectedAnswer === correctPosition ? '✅ Chính xác!' : '❌ Sai rồi!'}</h4>
                        <p>Câu này đứng ở vị trí thứ <strong>{correctPosition}</strong>.</p>
                        <Button onClick={handleNextQuestion} style={{ marginTop: 16 }}>
                            Next Question →
                        </Button>
                    </div>
                )}
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
                          <Button onClick={handleNextQuestion}>
                            Next Question →
                          </Button>
                          <Button onClick={() => setActiveTab('Viết lại câu')} variant="secondary">
                            Luyện tập viết câu
                          </Button>
                        </div>
            </div>
        </div>
    );
};

export default OrderingTab;