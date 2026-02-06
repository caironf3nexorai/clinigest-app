import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Procedure } from '../types/db';

interface MultiProcedureSelectProps {
    value: string;
    onChange: (value: string) => void;
    onPriceChange?: (total: number) => void;
    placeholder?: string;
}

// Classification of Procedures
const LOCALIZED_PROCEDURES = [
    'Extração',
    'Canal',
    'Endodontia',
    'Restauração',
    'Implante',
    'Coroa',
    'Raspagem',
    'Prótese Fixa'
];

type SelectedItem = {
    name: string;
    detail?: string; // Tooth or region
};

export function MultiProcedureSelect({ value, onChange, onPriceChange, placeholder = "Selecione..." }: MultiProcedureSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
    const [inputValue, setInputValue] = useState('');

    // Tooth Selection State
    const [pendingItem, setPendingItem] = useState<string | null>(null); // Procedimento aguardando dente
    const [toothInput, setToothInput] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchProcedures();
    }, []);

    useEffect(() => {
        // Parse initial value string back to SelectedItem[]
        if (!value) {
            setSelectedItems([]);
            return;
        }

        // Example string: "Limpeza, Extração (Dente 18), Consulta"
        const items = value.split(',').map(s => s.trim()).filter(Boolean);
        const parsed: SelectedItem[] = items.map(itemStr => {
            const match = itemStr.match(/^(.*?)\s*\((.*?)\)$/);
            if (match) {
                return { name: match[1], detail: match[2] };
            }
            return { name: itemStr };
        });

        // Only update if different to avoid loop
        // Simplified check: Compare lengths or join string
        // For now, we trust parent value is source of truth but prevent loop if string matches
        const currentString = generateString(selectedItems);
        if (value !== currentString) {
            setSelectedItems(parsed);
        }
    }, [value]); // Be careful with loops here

    // Handler to detect clicks outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setPendingItem(null); // Cancel pending tooth selection
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchProcedures = async () => {
        try {
            const { data } = await supabase
                .from('procedures')
                .select('*')
                .order('name');
            if (data) setProcedures(data);
        } catch (error) {
            console.error('Error fetching procedures:', error);
        }
    };

    const generateString = (items: SelectedItem[]) => {
        return items.map(i => i.detail ? `${i.name} (${i.detail})` : i.name).join(', ');
    };

    const updateParent = (newItems: SelectedItem[]) => {
        setSelectedItems(newItems);
        onChange(generateString(newItems));

        // Calculate Total Price
        if (onPriceChange) {
            let total = 0;
            newItems.forEach(item => {
                // Find matching procedure by name
                const proc = procedures.find(p => p.name === item.name);
                if (proc && proc.price) {
                    total += Number(proc.price);
                }
            });
            onPriceChange(total);
        }
    };

    const toggleItem = (procName: string) => {
        // Check if already selected
        const exists = selectedItems.find(i => i.name === procName);

        if (exists) {
            // Remove
            const newItems = selectedItems.filter(i => i.name !== procName);
            updateParent(newItems);
        } else {
            // Check if localized
            const isLocalized = LOCALIZED_PROCEDURES.some(p => procName.toLowerCase().includes(p.toLowerCase()));

            if (isLocalized) {
                setPendingItem(procName);
                setToothInput('');
            } else {
                // Add directly
                const newItems = [...selectedItems, { name: procName }];
                updateParent(newItems);
                setInputValue(''); // Clear search
            }
        }
    };

    const confirmTooth = () => {
        if (pendingItem && toothInput) {
            const newItems = [...selectedItems, { name: pendingItem, detail: `${toothInput}` }];
            updateParent(newItems);
            setPendingItem(null);
            setToothInput('');
            setInputValue('');
        }
    };

    const filteredProcedures = procedures.filter(p =>
        p.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Input / Display Area */}
            <div
                className="w-full min-h-[42px] p-2 bg-slate-50 border rounded-lg outline-none focus-within:ring-2 focus-within:ring-[var(--primary)] cursor-text flex flex-wrap gap-2 items-center"
                onClick={() => setIsOpen(true)}
            >
                {selectedItems.length === 0 && !inputValue && (
                    <span className="text-slate-400 absolute left-3">{placeholder}</span>
                )}

                {selectedItems.map((item, idx) => (
                    <span key={idx} className="bg-white border border-slate-200 text-slate-700 text-sm px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                        {item.name}
                        {item.detail && <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded uppercase font-bold">{item.detail}</span>}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                const newItems = selectedItems.filter((_, i) => i !== idx);
                                updateParent(newItems);
                            }}
                            className="text-slate-400 hover:text-red-500 ml-1"
                        >
                            <X size={12} />
                        </button>
                    </span>
                ))}

                <input
                    type="text"
                    className="bg-transparent outline-none text-sm min-w-[50px] flex-1"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">

                    {/* Tooth Input Overlay */}
                    {pendingItem && (
                        <div className="p-3 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <label className="block text-xs font-bold text-[var(--primary)] uppercase mb-1">
                                Qual dente/região para {pendingItem}?
                            </label>
                            <div className="flex gap-2">
                                <input
                                    autoFocus
                                    type="text"
                                    className="flex-1 border rounded px-2 py-1 text-sm"
                                    placeholder="Ex: 18, 24, Superior..."
                                    value={toothInput}
                                    onChange={e => setToothInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && confirmTooth()}
                                />
                                <button
                                    type="button"
                                    onClick={confirmTooth}
                                    className="bg-[var(--primary)] text-white px-3 py-1 rounded text-sm hover:opacity-90 transition-opacity"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    )}

                    {/* List */}
                    <div className="p-1">
                        {filteredProcedures.length === 0 && (
                            <div className="p-3 text-center text-slate-400 text-sm">
                                Nenhum procedimento encontrado.
                            </div>
                        )}
                        {filteredProcedures.map(proc => {
                            const isSelected = selectedItems.some(i => i.name === proc.name);
                            return (
                                <button
                                    key={proc.id}
                                    type="button"
                                    disabled={!!pendingItem} // Disable selection while waiting for detail
                                    onClick={() => toggleItem(proc.name)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group transition-colors
                                        ${isSelected ? 'bg-slate-50 text-[var(--primary)] font-medium' : 'text-slate-700 hover:bg-slate-50'}
                                        ${pendingItem ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                >
                                    <span>{proc.name}</span>
                                    {isSelected && <Check size={14} />}
                                    {!isSelected && <Plus size={14} className="opacity-0 group-hover:opacity-100 text-slate-400" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
