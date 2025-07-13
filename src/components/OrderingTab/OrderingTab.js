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
    
    // State mới để quản lý thứ tự câu hỏi đã xáo trộn
    const [shuffledIndices, setShuffledIndices] = useState([]);
    const [pointer, setPointer] = useState(0); // Con trỏ đến vị trí hiện tại trong mảng đã xáo trộn

    const [options, setOptions] = useState([]);
    const [isAnswered, setIsAnswered] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);

    // Hàm tạo các lựa chọn cho câu hỏi hiện tại
    const generateOptions = useCallback((correctIndex) => {
        if (sentences.length === 0) return;

        const correctPosition = correctIndex + 1;
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
    }, [sentences.length]);

    // Khởi tạo hoặc khi có bộ câu mới
    useEffect(() => {
        if (sentences.length > 0) {
            // Tạo một mảng các chỉ số (0, 1, 2,...) và xáo trộn nó
            const indices = Array.from(Array(sentences.length).keys());
            setShuffledIndices(shuffleArray(indices));
            setPointer(0);
        }
    }, [sentences]);

    // Tải câu hỏi và tạo đáp án khi con trỏ thay đổi
    useEffect(() => {
        if (shuffledIndices.length > 0) {
            const originalIndex = shuffledIndices[pointer];
            generateOptions(originalIndex);
        }
    }, [pointer, shuffledIndices, generateOptions]);

    const handleAnswerSelect = (position) => {
        if (isAnswered) return;
        setSelectedAnswer(position);
        setIsAnswered(true);
    };

    const handleNextQuestion = () => {
        const nextPointer = pointer + 1;
        // Nếu đã duyệt hết danh sách đã xáo trộn
        if (nextPointer >= shuffledIndices.length) {
            // Tạo một danh sách xáo trộn mới và bắt đầu lại từ đầu
            const indices = Array.from(Array(sentences.length).keys());
            setShuffledIndices(shuffleArray(indices));
            setPointer(0);
        } else {
            // Nếu chưa, đi đến câu tiếp theo trong danh sách xáo trộn
            setPointer(nextPointer);
        }
        setIsAnswered(false);
        setSelectedAnswer(null);
    };

    if (sentences.length === 0) {
        return <p>Không có dữ liệu câu. Vui lòng xử lý văn bản ở tab "Nhập liệu" trước.</p>;
    }
    
    // Lấy thông tin câu hỏi hiện tại dựa trên con trỏ và mảng đã xáo trộn
    const originalIndex = shuffledIndices[pointer];
    if (originalIndex === undefined) {
        return <p>Đang tải câu hỏi...</p>;
    }
    const currentSentence = sentences[originalIndex];
    const correctPosition = originalIndex + 1;

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