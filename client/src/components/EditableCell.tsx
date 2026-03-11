import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Button } from "./ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "./ui/utils";
import { useCellNav } from "./CellNavContext";

// ──────────────────────────────────────────
// Portal dropdown — rendered at <body> level
// so table overflow:hidden can't clip it
// ──────────────────────────────────────────
const PortalDropdown = ({
    anchorRef,
    options,
    currentValue,
    searchText,
    onSelect,
}: {
    anchorRef: React.RefObject<HTMLInputElement | null>;
    options: { label: string; value: string | number }[];
    currentValue: any;
    searchText: string;
    onSelect: (val: string | number) => void;
}) => {
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (anchorRef.current) {
            setRect(anchorRef.current.getBoundingClientRect());
        }
    }, [searchText]);

    if (!rect) return null;

    const filtered = options.filter(o =>
        o.label.toLowerCase().includes(searchText.toLowerCase()) ||
        String(o.value).toLowerCase().includes(searchText.toLowerCase())
    );

    if (filtered.length === 0) return null;

    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: rect.bottom,
                left: rect.left,
                width: Math.max(rect.width, 160),
                zIndex: 99999,
            }}
            className="bg-white border border-[#c5a059] border-t-0 rounded-b shadow-xl max-h-52 overflow-y-auto"
        >
            {filtered.map(opt => (
                <div
                    key={opt.value}
                    onMouseDown={e => {
                        e.preventDefault();
                        onSelect(opt.value);
                    }}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-[#c5a059]/10 hover:text-[#c5a059] transition-colors ${String(opt.value) === String(currentValue)
                        ? 'bg-[#c5a059]/10 text-[#c5a059] font-medium'
                        : 'text-slate-700'
                        }`}
                >
                    {opt.label}
                </div>
            ))}
        </div>,
        document.body
    );
};

// ──────────────────────────────────────────
// Main EditableCell
// ──────────────────────────────────────────
export const EditableCell = ({
    getValue,
    row,
    column,
    table,
    renderDisplay,
    options,
    isDate
}: {
    getValue: () => any
    row: any
    column: any
    table: any
    renderDisplay?: (val: any) => React.ReactNode
    options?: { label: string; value: string | number }[]
    isDate?: boolean
}) => {
    const initialValue = getValue();
    const [value, setValue] = useState(initialValue);
    const [searchText, setSearchText] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // ─── Cell Navigation ─────────────────────
    const { activeCell, setActiveCell, navigate } = useCellNav();
    const rowIndex = row.index;
    const colId = column.id;
    const isEditing = activeCell?.rowIndex === rowIndex && activeCell?.colId === colId;

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    // Auto-focus when this cell becomes active
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const closeCell = () => {
        setActiveCell(null);
        setDropdownOpen(false);
        setSearchText('');
    };

    const saveAndClose = (val: any) => {
        table.options.meta?.updateData(rowIndex, colId, val);
        closeCell();
    };

    const saveAndNavigate = (val: any, dir: 'up' | 'down' | 'left' | 'right') => {
        table.options.meta?.updateData(rowIndex, colId, val);
        navigate({ rowIndex, colId }, dir);
        setSearchText('');
        setDropdownOpen(false);
    };

    const commitCombo = (typed: string, dir?: 'up' | 'down' | 'left' | 'right') => {
        const matched = options?.find(
            o =>
                o.label.toLowerCase() === typed.toLowerCase() ||
                String(o.value).toLowerCase() === typed.toLowerCase()
        );
        const finalValue = matched ? matched.value : (typed || value);
        setValue(finalValue);
        if (dir) saveAndNavigate(finalValue, dir);
        else saveAndClose(finalValue);
    };

    const selectOption = (val: string | number) => {
        setValue(val);
        saveAndClose(val);
    };

    // General arrow key handler for plain text inputs
    const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const cur = (e.target as HTMLInputElement).value;
        if (e.key === 'Escape') { closeCell(); return; }
        if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); setValue(cur); saveAndNavigate(cur, 'down'); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setValue(cur); saveAndNavigate(cur, 'up'); }
        else if (e.key === 'Tab') {
            e.preventDefault();
            setValue(cur);
            saveAndNavigate(cur, e.shiftKey ? 'left' : 'right');
        }
        else if (e.key === 'ArrowRight') {
            // Only navigate if cursor is at end of input
            const inp = e.target as HTMLInputElement;
            if (inp.selectionStart === inp.value.length) { e.preventDefault(); setValue(cur); saveAndNavigate(cur, 'right'); }
        }
        else if (e.key === 'ArrowLeft') {
            const inp = e.target as HTMLInputElement;
            if (inp.selectionStart === 0) { e.preventDefault(); setValue(cur); saveAndNavigate(cur, 'left'); }
        }
    };

    // Key handler for combobox input
    const handleComboKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') { closeCell(); return; }
        if (e.key === 'Enter') { e.preventDefault(); commitCombo(searchText, 'down'); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); commitCombo(searchText, 'down'); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); commitCombo(searchText, 'up'); return; }
        if (e.key === 'Tab') {
            e.preventDefault();
            commitCombo(searchText, e.shiftKey ? 'left' : 'right');
            return;
        }
    };

    // ──── DATE picker ────────────────────────
    if (isEditing && isDate) {
        let dateValue: Date | undefined = undefined;
        if (value) {
            dateValue = new Date(value);
            if (isNaN(dateValue.getTime()) || (typeof value === 'string' && value.includes('/'))) {
                const parts = (value as string).split('/');
                if (parts.length === 3) {
                    const d = parseInt(parts[0]);
                    const m = parseInt(parts[1]) - 1;
                    const y = parseInt(parts[2]);
                    dateValue = new Date(y, m, d);
                }
            }
        }

        return (
            <Popover open={isEditing} onOpenChange={(open: boolean) => { if (!open) closeCell(); }}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full justify-start text-left font-normal h-8 text-xs",
                            !value && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value ? value : "Pick a date"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={dateValue}
                        onSelect={(date) => {
                            if (date) {
                                const y = date.getFullYear();
                                const m = String(date.getMonth() + 1).padStart(2, '0');
                                const d = String(date.getDate()).padStart(2, '0');
                                const formattedDate = `${y}-${m}-${d}`;
                                setValue(formattedDate);
                                saveAndClose(formattedDate);
                            }
                        }}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        );
    }

    // ──── COMBOBOX (Google Sheets style) ─────
    if (isEditing && options) {
        return (
            <div className="relative w-full">
                <input
                    ref={inputRef}
                    autoFocus
                    value={searchText}
                    onChange={e => { setSearchText(e.target.value); setDropdownOpen(true); }}
                    onKeyDown={handleComboKeyDown}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={() => {
                        setTimeout(() => {
                            setDropdownOpen(false);
                            // Save on blur using typed text (or keep previous)
                            const matched = options.find(
                                o => o.label.toLowerCase() === searchText.toLowerCase() ||
                                    String(o.value).toLowerCase() === searchText.toLowerCase()
                            );
                            const final = matched ? matched.value : (searchText || value);
                            setValue(final);
                            table.options.meta?.updateData(rowIndex, colId, final);
                            closeCell();
                        }, 150);
                    }}
                    placeholder={String(value || '')}
                    className="w-full border border-[#c5a059] rounded px-2 py-1 text-sm outline-none bg-white text-slate-800 placeholder:text-slate-400"
                />
                {dropdownOpen && (
                    <PortalDropdown
                        anchorRef={inputRef}
                        options={options}
                        currentValue={value}
                        searchText={searchText}
                        onSelect={selectOption}
                    />
                )}
            </div>
        );
    }

    // ──── FREE TEXT input ────────────────────
    if (isEditing) {
        return (
            <input
                ref={inputRef}
                value={value ?? ''}
                onChange={e => setValue(e.target.value)}
                onBlur={() => { table.options.meta?.updateData(rowIndex, colId, value); closeCell(); }}
                onKeyDown={handleTextKeyDown}
                autoFocus
                className="w-full bg-transparent border border-[#c5a059] rounded px-2 py-1 outline-none text-foreground text-sm"
            />
        );
    }

    // ──── DISPLAY (read-only) ─────────────────
    return (
        <div
            onClick={() => {
                setActiveCell({ rowIndex, colId });
                if (options) {
                    setSearchText('');
                    setDropdownOpen(true);
                }
            }}
            className="cursor-pointer min-h-[24px] flex items-center hover:bg-black/5 -m-2 p-2 rounded transition-colors"
            title="Click to edit"
        >
            {renderDisplay ? renderDisplay(value) : (value || '-')}
        </div>
    );
};
