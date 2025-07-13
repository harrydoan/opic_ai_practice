import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import Button from '../common/Button';
import './OrderingTab.css';

// Hàm shuffle mảng tiện ích
const shuffleArray = (array) => {
    return [...array].sort(() => Math.random() - 0.5);
};

const OrderingTab = () => {
    const { sentences } = useContext(AppContext);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [options, setOptions] = useState([]);
    const [isAnswered, setIsAnswered] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);

    // Hàm tạo các lựa chọn cho câu hỏi hiện tại
    const generateOptions = useCallback(() => {
        if (sentences.length === 0) return;

        const correctPosition = currentIndex + 1;
        let wrongPositions = [];

        // Tạo 3 vị trí sai ngẫu nhiên
        while (wrongPositions.length < 3) {
            const randomPos = Math.floor(Math.random() * sentences.length) + 1;
            if (randomPos !== correctPosition && !wrongPositions.includes(randomPos)) {
                wrongPositions.push(randomPos);
            }
        }
        
        const shuffledOptions = shuffleArray([correctPosition, ...wrongPositions]);
        setOptions(shuffledOptions);
    }, [currentIndex, sentences.length]);

    // Tải câu hỏi đầu tiên hoặc khi chuyển câu
    useEffect(() => {
        generateOptions();
    }, [currentIndex, generateOptions]);

    const handleAnswerSelect = (position) => {
        if (isAnswered) return;
        setSelectedAnswer(position);
        setIsAnswered(true);
    };

    const handleNextQuestion = () => {
        const nextIndex = (currentIndex + 1) % sentences.length; // Quay vòng khi hết
        setCurrentIndex(nextIndex);
        setIsAnswered(false);
        setSelectedAnswer(null);
    };

    if (sentences.length === 0) {
        return <p>Không có dữ liệu câu. Vui lòng xử lý văn bản ở tab "Nhập liệu" trước.</p>;
    }

    const currentSentence = sentences[currentIndex];
    const correctPosition = currentIndex + 1;

    return (
        <div className="ordering-tab-container">
            <h3>❓ Câu này ở vị trí thứ mấy trong đoạn văn?</h3>
            <div className="sentence-box">
                "{currentSentence}"
            </div>
            <div className="ordering-options-grid">
                {options.map(option => {
                    let btnClass = 'ordering-btn';
                    if (isAnswered) {
                        if (option === correctPosition) {
                            btnClass += ' correct';
                        } else if (option === selectedAnswer) {
                            btnClass += ' incorrect';
                        } else {
                            btnClass += ' disabled';
                        }
                    }
                    return (
                        <button 
                            key={option}
                            className={btnClass}
                            onClick={() => handleAnswerSelect(option)}
                            disabled={isAnswered}
                        >
                            Vị trí {option}
                        </button>
                    );
                })}
            </div>
            {isAnswered && (
                <div className="ordering-feedback">
                    <h4>
                        {selectedAnswer === correctPosition ? '✅ Chính xác!' : '❌ Sai rồi!'}
                    </h4>
                    <p>
                        Câu này đứng ở vị trí thứ <strong>{correctPosition}</strong> trong đoạn văn.
                    </p>
                    <Button onClick={handleNextQuestion}>
                        Câu tiếp theo →
                    </Button>
                </div>
            )}
        </div>
    );
};

export default OrderingTab;