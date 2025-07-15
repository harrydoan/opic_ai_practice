import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import Button from '../common/Button';
import './OrderingTab.css';

const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

const OrderingTab = () => {
    const { sentenceData } = useContext(AppContext);

    // Bộ bài chỉ số câu, lặp lại vô hạn
    const [deck, setDeck] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    // State cho giao diện
    const [isAnswered, setIsAnswered] = useState(false);
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
        return <div className="practice-tab-container"><p>Không có dữ liệu. Vui lòng xử lý văn bản ở tab "Nhập liệu".</p></div>;
    }

    const currentSentence = sentenceData[deck[currentIndex]]?.originalText;
    const correctPosition = deck[currentIndex] + 1;

    return (
        <div className="practice-tab-container">
            <div className="practice-card">
                <div className="practice-progress">
                    <span style={{ color: "#4facfe", fontWeight: "bold" }}>Sắp xếp câu</span>
                </div>
                <h3>❓ Câu này ở vị trí thứ mấy trong đoạn văn?</h3>
                <div className="practice-question">{currentSentence}</div>
                <div className="practice-options">
                    {options.map(option => {
                        let btnClass = 'practice-btn';
                        if (isAnswered) {
                            if (option === correctPosition) btnClass += ' correct';
                            else if (option === selectedAnswer) btnClass += ' incorrect';
                            else btnClass += ' disabled';
                        }
                        return (
                            <Button
                                key={option}
                                className={btnClass}
                                onClick={() => handleAnswerSelect(option)}
                                disabled={isAnswered}
                                style={{ minWidth: 64, margin: '8px', borderRadius: 12 }}
                            >
                                Vị trí {option}
                            </Button>
                        );
                    })}
                </div>
                {isAnswered && (
                    <div className={`practice-feedback ${selectedAnswer === correctPosition ? 'success' : 'error'}`}>
                        <h4>{selectedAnswer === correctPosition ? '✅ Chính xác!' : '❌ Sai rồi!'}</h4>
                        <p>Câu này đứng ở vị trí thứ <strong>{correctPosition}</strong>.</p>
                        <Button onClick={handleNextQuestion} style={{ marginTop: 16 }}>
                            Next Question →
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderingTab;