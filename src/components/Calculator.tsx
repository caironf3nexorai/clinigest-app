import React, { useState } from 'react';
import { X, Delete, Equal } from 'lucide-react';

type CalculatorProps = {
    onClose: () => void;
    onConfirm: (value: number) => void;
    initialValue?: number;
};

export const Calculator = ({ onClose, onConfirm, initialValue = 0 }: CalculatorProps) => {
    const [display, setDisplay] = useState(initialValue ? String(initialValue) : '0');
    const [expression, setExpression] = useState('');
    const [waitingForOperand, setWaitingForOperand] = useState(false);

    const inputDigit = (digit: string) => {
        if (waitingForOperand) {
            setDisplay(digit);
            setWaitingForOperand(false);
        } else {
            setDisplay(display === '0' ? digit : display + digit);
        }
    };

    const inputDot = () => {
        if (waitingForOperand) {
            setDisplay('0.');
            setWaitingForOperand(false);
        } else if (display.indexOf('.') === -1) {
            setDisplay(display + '.');
        }
    };

    const clear = () => {
        setDisplay('0');
        setExpression('');
        setWaitingForOperand(false);
    };

    // Safe evaluation using Function constructor instead of eval (still risky but controlled input)
    // Or better, a simple parser. For this MVP, we'll implement simple operations logic or use a safe eval.
    // Let's use a simple approach: building the string and using Function safely-ish since it's client side user input only.
    const calculate = () => {
        try {
            // Replace visual 'x' with '*'
            const sanitizedExpression = (expression + display).replace(/x/g, '*');
            // eslint-disable-next-line
            const result = new Function('return ' + sanitizedExpression)();

            const finiteResult = Number.isFinite(result) ? result : 0;
            setDisplay(String(finiteResult));
            setExpression('');
            setWaitingForOperand(true);
            return finiteResult;
        } catch (e) {
            setDisplay('Error');
            return 0;
        }
    };

    const performOperation = (nextOperator: string) => {
        const inputValue = parseFloat(display);

        if (expression && !waitingForOperand) {
            // Calculate existing first
            try {
                const sanitizedExpression = (expression + display).replace(/x/g, '*');
                // eslint-disable-next-line
                const result = new Function('return ' + sanitizedExpression)();
                setDisplay(String(result));
                setExpression(String(result) + ' ' + nextOperator + ' ');
            } catch (e) {
                // error
            }
        } else {
            setExpression(display + ' ' + nextOperator + ' ');
        }

        setWaitingForOperand(true);
    };

    const handleConfirm = () => {
        // If there's a pending calculation, calculate it first
        let finalValue = parseFloat(display);
        if (expression && !waitingForOperand) {
            finalValue = calculate();
        }
        onConfirm(finalValue);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 text-white rounded-2xl shadow-2xl w-full max-w-[320px] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-4 bg-slate-800">
                    <span className="font-bold text-lg">Calculadora</span>
                    <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Display */}
                <div className="p-6 text-right bg-slate-900 border-b border-slate-800">
                    <div className="text-slate-400 text-sm h-6">{expression}</div>
                    <div className="text-4xl font-bold tracking-wider truncate">{display}</div>
                </div>

                {/* Confirm Display */}
                <div className="px-4 py-2 bg-slate-800/50 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Valor a inserir:</span>
                    <span className="text-emerald-400 font-bold">R$ {parseFloat(display).toFixed(2)}</span>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-4 gap-px bg-slate-800">
                    {/* Row 1 */}
                    <button onClick={clear} className="p-4 bg-slate-700 hover:bg-slate-600 text-red-300 font-bold col-span-3">AC</button>
                    <button onClick={() => performOperation('/')} className="p-4 bg-orange-500 hover:bg-orange-400 font-bold text-xl">÷</button>

                    {/* Row 2 */}
                    <button onClick={() => inputDigit('7')} className="p-4 bg-slate-800 hover:bg-slate-700 font-medium text-xl">7</button>
                    <button onClick={() => inputDigit('8')} className="p-4 bg-slate-800 hover:bg-slate-700 font-medium text-xl">8</button>
                    <button onClick={() => inputDigit('9')} className="p-4 bg-slate-800 hover:bg-slate-700 font-medium text-xl">9</button>
                    <button onClick={() => performOperation('*')} className="p-4 bg-orange-500 hover:bg-orange-400 font-bold text-xl">×</button>

                    {/* Row 3 */}
                    <button onClick={() => inputDigit('4')} className="p-4 bg-slate-800 hover:bg-slate-700 font-medium text-xl">4</button>
                    <button onClick={() => inputDigit('5')} className="p-4 bg-slate-800 hover:bg-slate-700 font-medium text-xl">5</button>
                    <button onClick={() => inputDigit('6')} className="p-4 bg-slate-800 hover:bg-slate-700 font-medium text-xl">6</button>
                    <button onClick={() => performOperation('-')} className="p-4 bg-orange-500 hover:bg-orange-400 font-bold text-xl">-</button>

                    {/* Row 4 */}
                    <button onClick={() => inputDigit('1')} className="p-4 bg-slate-800 hover:bg-slate-700 font-medium text-xl">1</button>
                    <button onClick={() => inputDigit('2')} className="p-4 bg-slate-800 hover:bg-slate-700 font-medium text-xl">2</button>
                    <button onClick={() => inputDigit('3')} className="p-4 bg-slate-800 hover:bg-slate-700 font-medium text-xl">3</button>
                    <button onClick={() => performOperation('+')} className="p-4 bg-orange-500 hover:bg-orange-400 font-bold text-xl">+</button>

                    {/* Row 5 */}
                    <button onClick={() => inputDigit('0')} className="p-4 bg-slate-800 hover:bg-slate-700 font-medium text-xl col-span-2">0</button>
                    <button onClick={inputDot} className="p-4 bg-slate-800 hover:bg-slate-700 font-medium text-xl">.</button>
                    <button onClick={calculate} className="p-4 bg-orange-500 hover:bg-orange-400 font-bold text-xl">=</button>
                </div>

                {/* Action */}
                <button
                    onClick={handleConfirm}
                    className="w-full p-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg flex items-center justify-center gap-2 transition-colors"
                >
                    <CheckCircle size={24} />
                    Usar este valor
                </button>
            </div>
        </div>
    );
};

// Helper icon import fix
import { CheckCircle } from 'lucide-react';
