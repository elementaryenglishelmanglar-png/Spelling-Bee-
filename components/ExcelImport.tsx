import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { GradeLevel, WordEntry } from '../types';
import { enrichWordWithGemini } from '../services/geminiService';
import { FileSpreadsheet, Download, Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '../lib/toastContext';

interface ExcelImportProps {
    currentGrade: GradeLevel;
    onAddWord: (word: WordEntry) => void;
}

interface WordRow {
    wordNumber: number;
    word: string;
}

type ImportStatus = 'idle' | 'parsing' | 'enriching' | 'done';

interface ProgressState {
    current: number;
    total: number;
    currentWord: string;
    succeeded: number;
    failed: number;
}

export const ExcelImport: React.FC<ExcelImportProps> = ({ currentGrade, onAddWord }) => {
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<ImportStatus>('idle');
    const [progress, setProgress] = useState<ProgressState | null>(null);
    const [showModal, setShowModal] = useState(false);
    const abortRef = useRef(false);

    // -------------------------------------------------------------------
    // Download a template .xlsx with 200 rows (number + empty word column)
    // -------------------------------------------------------------------
    const handleDownloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        const rows: (string | number)[][] = [['#', 'Word']];
        for (let i = 1; i <= 200; i++) {
            rows.push([i, '']);
        }
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 6 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Word List');
        XLSX.writeFile(wb, 'spelling_bee_template.xlsx');
    };

    // -------------------------------------------------------------------
    // Parse the uploaded file and start the AI enrichment pipeline
    // -------------------------------------------------------------------
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatus('parsing');
        setShowModal(true);
        abortRef.current = false;

        let rows: WordRow[] = [];
        try {
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

            // Skip header row if present (first cell is text like "#" or "Number")
            const startRow = typeof raw[0]?.[0] === 'string' && isNaN(Number(raw[0][0])) ? 1 : 0;

            for (let i = startRow; i < raw.length; i++) {
                const [numCell, wordCell] = raw[i];
                const wordNum = Number(numCell);
                const wordText = String(wordCell ?? '').trim();
                if (wordText && !isNaN(wordNum) && wordNum > 0) {
                    rows.push({ wordNumber: wordNum, word: wordText });
                }
            }
        } catch (err) {
            showToast('Could not parse the file. Make sure it is a valid .xlsx or .xls file.', 'error');
            setStatus('idle');
            setShowModal(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        if (rows.length === 0) {
            showToast('No words found in the file.', 'warning');
            setStatus('idle');
            setShowModal(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // ----------------------------------------------------------------
        // Enrich each word with AI, one by one
        // ----------------------------------------------------------------
        setStatus('enriching');
        let succeeded = 0;
        let failed = 0;

        for (let i = 0; i < rows.length; i++) {
            if (abortRef.current) break;

            const { wordNumber, word } = rows[i];
            setProgress({ current: i + 1, total: rows.length, currentWord: word, succeeded, failed });

            try {
                const enrichment = await enrichWordWithGemini(word, currentGrade);
                const newWord: WordEntry = {
                    id: crypto.randomUUID(),
                    word,
                    grade: currentGrade,
                    wordNumber,
                    ...enrichment,
                };
                onAddWord(newWord);
                succeeded++;
            } catch {
                failed++;
            }

            setProgress({ current: i + 1, total: rows.length, currentWord: word, succeeded, failed });
        }

        setStatus('done');
        setProgress(prev => prev ? { ...prev, succeeded, failed } : null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        if (!abortRef.current) {
            showToast(`Import complete: ${succeeded} word${succeeded !== 1 ? 's' : ''} added${failed > 0 ? `, ${failed} failed` : ''}!`, succeeded > 0 ? 'success' : 'error');
        }
    };

    const handleClose = () => {
        abortRef.current = true;
        setShowModal(false);
        setStatus('idle');
        setProgress(null);
    };

    const gradeName = currentGrade === 12 ? 'Group 3' : `Grade ${currentGrade}`;

    return (
        <>
            {/* Trigger row */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                        <FileSpreadsheet size={22} />
                    </div>
                    <div>
                        <p className="font-bold text-stone-800 text-sm">Import from Excel</p>
                        <p className="text-xs text-stone-500">Two columns: # and Word. Empty rows are ignored. AI enriches each word automatically.</p>
                    </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm font-semibold transition-colors"
                    >
                        <Download size={15} />
                        Template
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={status === 'enriching' || status === 'parsing'}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white text-sm font-bold transition-colors"
                    >
                        <Upload size={15} />
                        Upload .xlsx
                    </button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>

            {/* Progress Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md relative animate-fade-in">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                                    <FileSpreadsheet size={22} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-stone-900">Importing Words</h3>
                                    <p className="text-xs text-stone-500">{gradeName} · AI Auto-Fill</p>
                                </div>
                            </div>
                            {status === 'done' && (
                                <button onClick={handleClose} className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 transition-colors">
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {/* Status body */}
                        {(status === 'parsing') && (
                            <div className="flex items-center gap-3 text-stone-600">
                                <Loader2 size={20} className="animate-spin text-emerald-500" />
                                <span className="text-sm font-medium">Reading file…</span>
                            </div>
                        )}

                        {(status === 'enriching' || status === 'done') && progress && (
                            <div className="space-y-4">
                                {/* Progress bar */}
                                <div>
                                    <div className="flex justify-between text-xs text-stone-500 mb-1.5">
                                        <span>{status === 'done' ? 'Complete!' : `Processing ${progress.current} of ${progress.total}`}</span>
                                        <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                                    </div>
                                    <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
                                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Current word */}
                                {status === 'enriching' && (
                                    <div className="flex items-center gap-2 bg-stone-50 px-4 py-3 rounded-xl">
                                        <Loader2 size={15} className="animate-spin text-emerald-500 flex-shrink-0" />
                                        <span className="text-sm text-stone-700 font-medium truncate">
                                            Enriching: <span className="text-stone-900 font-bold">"{progress.currentWord}"</span>
                                        </span>
                                    </div>
                                )}

                                {/* Summary counters */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-2 bg-emerald-50 px-4 py-3 rounded-xl">
                                        <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Added</p>
                                            <p className="text-xl font-black text-emerald-700">{progress.succeeded}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-rose-50 px-4 py-3 rounded-xl">
                                        <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-rose-500 font-semibold uppercase tracking-wide">Failed</p>
                                            <p className="text-xl font-black text-rose-600">{progress.failed}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Done actions */}
                                {status === 'done' && (
                                    <button
                                        onClick={handleClose}
                                        className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl transition-colors"
                                    >
                                        Done
                                    </button>
                                )}

                                {/* Cancel while running */}
                                {status === 'enriching' && (
                                    <button
                                        onClick={handleClose}
                                        className="w-full py-2.5 border border-stone-200 text-stone-500 font-semibold rounded-xl hover:bg-stone-50 text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
