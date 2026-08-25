'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Calculator } from 'lucide-react';
import { CALCULATORS } from '@/lib/calculators';
import { CalculatorContent } from '@/lib/calculator-content';
import { SlidingTabs, TrackAccordion, NumberPop } from '@/components/transitions/Motion';

export function CalculatorClient({ calculatorId }: { calculatorId: string }) {
    const router = useRouter();
    const calculatorConfig = CALCULATORS.find(c => c.id === calculatorId);
    
    const [oddsFormat, setOddsFormat] = useState<'decimal' | 'american' | 'fraction' | 'probability'>(() => {
        try {
            const f = (localStorage.getItem('active_bankroll_odds_format') || 'decimal').toLowerCase();
            if (f === 'american') return 'american';
            if (f === 'fractional' || f === 'fraction') return 'fraction';
            if (f === 'cents') return 'decimal'; // calculators don't have cents mode
            return 'decimal';
        } catch {
            return 'decimal';
        }
    });

    const [values, setValues] = useState<Record<string, any>>(() => {
        const initial: Record<string, any> = {};
        calculatorConfig?.inputs.forEach(input => {
            if (input.defaultValue !== undefined) {
                initial[input.id] = input.defaultValue;
            } else {
                initial[input.id] = '';
            }
        });
        return initial;
    });

    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        if (!calculatorConfig) return;
        try {
            const res = calculatorConfig.calculate({ ...values, _oddsFormat: oddsFormat });
            setResult(res);
        } catch (e) {
            setResult({ error: 'Calculation error.' });
        }
    }, [values, calculatorConfig, oddsFormat]);

    if (!calculatorConfig) {
        return (
            <div className="max-w-4xl mx-auto pb-12">
                <Link href="/track/calculators" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-[#121212] transition-colors mb-6">
                    <ChevronLeft size={16} />
                    Back to Calculators
                </Link>
                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-[14px] text-gray-500">
                    Calculator not found.
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-12">
            
            <div className="mb-6 overflow-x-auto pb-1">
                <SlidingTabs
                    value={calculatorId}
                    onChange={(id) => router.push(`/track/calculators/${id}`)}
                    className="rounded-[2.5rem]"
                    buttonClassName="h-9 px-4 whitespace-nowrap"
                    items={CALCULATORS.map((calc) => ({ id: calc.id, label: calc.shortName || calc.name }))}
                />
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm max-w-5xl">
                <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-[#10b981] shadow-sm">
                            <Calculator size={24} strokeWidth={1.5} />
                        </div>
                        <div>
                            <h1 className="text-[24px] font-bold tracking-tight text-[#121212]">{calculatorConfig.name}</h1>
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Inputs */}
                    <div className="lg:col-span-3 space-y-5">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[14px] font-bold text-[#121212] uppercase tracking-wider">Inputs</h3>
                            <SlidingTabs
                                value={oddsFormat}
                                onChange={setOddsFormat}
                                className="rounded-lg"
                                buttonClassName="h-8 px-3 whitespace-nowrap"
                                items={[
                                    { id: 'fraction', label: 'Fraction' },
                                    { id: 'decimal', label: 'Decimal' },
                                    { id: 'american', label: 'American' },
                                    { id: 'probability', label: 'Probability %' },
                                ]}
                            />
                        </div>
                        
                        {calculatorConfig.inputs.map(input => {
                            let label = input.label;
                            let placeholder = input.placeholder;
                            if (label.toLowerCase().includes('odds') || placeholder?.includes('+') || placeholder?.includes('-')) {
                                label = label.replace(/ \(Decimal or American\)/ig, '').replace(/ \(American or Decimal\)/ig, '');
                                if (oddsFormat === 'decimal') {
                                    if (placeholder?.includes('+110')) placeholder = '2.10';
                                    if (placeholder?.includes('-105')) placeholder = '1.95';
                                    if (placeholder?.includes('-110')) placeholder = '1.91';
                                    if (placeholder?.includes('+150')) placeholder = '2.50';
                                } else if (oddsFormat === 'fraction') {
                                    if (placeholder?.includes('2.10') || placeholder?.includes('+110')) placeholder = '11/10';
                                    if (placeholder?.includes('1.95') || placeholder?.includes('-105')) placeholder = '19/20';
                                    if (placeholder?.includes('1.91') || placeholder?.includes('-110')) placeholder = '10/11';
                                    if (placeholder?.includes('2.50') || placeholder?.includes('+150')) placeholder = '6/4';
                                } else if (oddsFormat === 'probability') {
                                    if (placeholder?.includes('2.10') || placeholder?.includes('+110')) placeholder = '47.62';
                                    if (placeholder?.includes('1.95') || placeholder?.includes('-105')) placeholder = '51.28';
                                    if (placeholder?.includes('1.91') || placeholder?.includes('-110')) placeholder = '52.38';
                                    if (placeholder?.includes('2.50') || placeholder?.includes('+150')) placeholder = '40.00';
                                } else {
                                    if (placeholder?.includes('2.10')) placeholder = '+110';
                                    if (placeholder?.includes('1.95')) placeholder = '-105';
                                    if (placeholder?.includes('1.91')) placeholder = '-110';
                                    if (placeholder?.includes('2.50')) placeholder = '+150';
                                }
                            }

                            return (
                            <div key={input.id} className="space-y-1.5">
                                <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                                    {label}
                                </label>
                                {input.type === 'select' ? (
                                    <select
                                        className="w-full text-[14px] font-semibold text-[#121212] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all"
                                        value={values[input.id]}
                                        onChange={(e) => setValues({ ...values, [input.id]: e.target.value })}
                                    >
                                        {input.options?.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={input.type === 'number' ? 'number' : 'text'}
                                        className="w-full text-[14px] font-semibold text-[#121212] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 focus:bg-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] outline-none transition-all"
                                        placeholder={placeholder}
                                        value={values[input.id]}
                                        onChange={(e) => setValues({ ...values, [input.id]: e.target.value })}
                                    />
                                )}
                            </div>
                            );
                        })}
                    </div>

                    {/* Results */}
                    <div className="lg:col-span-2">
                        <div className="bg-gray-900 rounded-xl p-6 text-white h-full shadow-md flex flex-col">
                            <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-5">Results</h3>
                            
                            {result?.error ? (
                                <div className="text-[14px] text-gray-400 font-medium my-auto text-center">
                                    {result.error}
                                </div>
                            ) : result ? (
                                <div className="space-y-6 flex-1">
                                    {/* Primary Result */}
                                    {result.result && (
                                        <div>
                                            <div className="text-[28px] font-bold text-[#10b981] leading-tight">
                                                <NumberPop value={String(result.result)} />
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Secondary Results */}
                                    <div className="space-y-3 pt-4 border-t border-gray-800">
                                        {Object.entries(result).filter(([k]) => k !== 'result' && k !== 'error').map(([key, value]) => {
                                            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                            return (
                                                <div key={key} className="flex justify-between items-end">
                                                    <span className="text-[13px] font-medium text-gray-400">{label}</span>
                                                    <span className="text-[15px] font-bold">
                                                        {(typeof value === 'string' || typeof value === 'number')
                                                            ? <NumberPop value={value} />
                                                            : (value as React.ReactNode)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-[14px] text-gray-400 font-medium my-auto text-center">
                                    Enter values to calculate.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {CalculatorContent[calculatorId] ? (
                <div className="max-w-5xl mt-8">
                    {CalculatorContent[calculatorId]}
                </div>
            ) : (
                <div className="max-w-5xl mt-6 bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
                    <TrackAccordion
                        items={[
                            {
                                title: `How does the ${calculatorConfig.name} work?`,
                                content: calculatorConfig.seoDescription || calculatorConfig.description,
                                defaultOpen: true,
                            },
                        ]}
                    />
                </div>
            )}
        </div>
    );
}
