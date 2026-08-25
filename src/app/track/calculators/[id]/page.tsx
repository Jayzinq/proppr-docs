import { CALCULATORS } from '@/lib/calculators';
import { notFound } from 'next/navigation';
import { CalculatorClient } from './CalculatorClient';

export function generateStaticParams() {
    return CALCULATORS.map((calc) => ({
        id: calc.id,
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const calc = CALCULATORS.find(c => c.id === id);
    if (!calc) return { title: 'Not Found' };
    
    return {
        title: `${calc.name} | Proppr Betting Calculators`,
        description: calc.seoDescription || calc.description,
    };
}

export default async function CalculatorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const calc = CALCULATORS.find(c => c.id === id);
    
    if (!calc) {
        notFound();
    }

    return <CalculatorClient calculatorId={id} />;
}
