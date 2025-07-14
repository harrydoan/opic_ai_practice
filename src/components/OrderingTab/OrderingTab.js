import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import Button from '../common/Button';
import './OrderingTab.css';

const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

const OrderingTab = () => {
    const { sentenceData, setUserDefinedOrder } = useContext(AppContext);
    
    // State cho logic vòng chơi
    const [unansweredIndices, setUnansweredIndices] = useState([]);
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(null);
    const [options, setOptions] = useState([]);
    
    // State cho giao diện
    const [isAnswered, setIsAnswered] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [correctlyPlacedCount, setCorrectlyPlacedCount] = useState(0);

    // Khởi tạo vòng chơi
    useEffect(() => {
        if (sentenceData.length > 0) {
            const allIndices = Array.from(Array(sentenceData.length).keys());
            setUnansweredIndices(shuffleArray(allIndices));
            setCorrectlyPlacedCount(0);
        }
    }, [sentenceData]);
    
    // Lấy câu hỏi tiếp theo từ danh sách chưa trả lời
    useEffect(() => {
        if (unansweredIndices.length > 0) {
            setCurrentSentenceIndex(unansweredIndices[0]);
        } else if (sentenceData.length > 0) {
            // Hoàn thành xuất sắc!
            const finalOrder = Array.from(Array(sentenceData.length).keys());
            setUserDefinedOrder(finalOrder); // Lưu lại thứ tự đúng vào context
        }
    }, [unansweredIndices, sentenceData.length, setUserDefinedOrder]);

    // Tạo các lựa chọn đáp án khi có câu hỏi mới
    const generateOptions = useCallback(() => {
        if (currentSentenceIndex === null || sentenceData.length === 0) return;

        const correctPosition = currentSentenceIndex + 1;
        let wrongPositions = [];
        while (wrongPositions.length < 3) {
            const randomPos = Math.floor(Math.random() * sentenceData.length) + 1;
            if (randomPos !== correctPosition && !wrongPositions.includes(randomPos)) {
                wrongPositions.push(randomPos);
            }
        }
        setOptions(shuffleArray([correctPosition, ...wrongPositions]));
    }, [currentSentenceIndex, sentenceData.length]);

    useEffect(() => {
        generateOptions();
    }, [generateOptions]);

    const handleAnswerSelect = (position) => {
        if (isAnswered) return;
        setSelectedAnswer(position);
        setIsAnswered(true);
        if (position === currentSentenceIndex + 1) {
            setCorrectlyPlacedCount(prev => prev + 1);
        }
    };

    const handleNextQuestion = () => {
        setIsAnswered(false);
        setSelectedAnswer(null);
        // Loại bỏ câu vừa trả lời khỏi danh sách
        setUnansweredIndices(prev => prev.slice(1));
    };

    if (sentenceData.length === 0) {
        return <p>Không có dữ liệu. Vui lòng xử lý văn bản ở tab "Nhập liệu".</p>;
    }
    
    // Khi đã hoàn thành tất cả
    if (unansweredIndices.length === 0) {
        return (
            <div className="ordering-tab-container completion-message">
                <h4>🎉 Chúc mừng!</h4>
                <p>Bạn đã sắp xếp thành công toàn bộ đoạn văn.</p>
                <p>Vòng luyện tập tiếp theo sẽ đi theo đúng thứ tự câu chuyện này.</p>
                <Button onClick={() => {
                    // Chơi lại từ đầu
                    const allIndices = Array.from(Array(sentenceData.length).keys());
                    setUnansweredIndices(shuffleArray(allIndices));
                    setCorrectlyPlacedCount(0);
                }}>Chơi lại</Button>
            </div>
        );
    }
    
    const currentSentence = sentenceData.find(s => s.originalIndex === currentSentenceIndex)?.originalText;
    const correctPosition = currentSentenceIndex + 1;

    return (
        <div className="ordering-tab-container">
            <p className="progress-counter">Đã xếp đúng: {correctlyPlacedCount} / {sentenceData.length}</p>
            <h3>❓ Câu này ở vị trí thứ mấy trong đoạn văn?</h3>
            <div className="sentence-box">"{currentSentence}"</div>
            <div className="ordering-options-grid">
                {options.map(option => {
                    let btnClass = 'ordering-btn';
                    if (isAnswered) {
                        if (option === correctPosition) btnClass += ' correct';
                        else if (option === selectedAnswer) btnClass += ' incorrect';
                        else btnClass += ' disabled';
                    }
                    return <button key={option} className={btnClass} onClick={() => handleAnswerSelect(option)} disabled={isAnswered}>Vị trí {option}</button>;
                })}
            </div>
            {isAnswered && (
                <div className="ordering-feedback">
                    <h4>{selectedAnswer === correctPosition ? '✅ Chính xác!' : '❌ Sai rồi!'}</h4>
                    <p>Câu này đứng ở vị trí thứ <strong>{correctPosition}</strong>.</p>
                    <Button onClick={handleNextQuestion}>Câu tiếp theo →</Button>
                </div>
            )}
        </div>
    );
};

export default OrderingTab;