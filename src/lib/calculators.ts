import { toAmerican, toFractional, oddsToDecimal } from './odds';

export type CalculatorInput = {
    id: string;
    label: string;
    type: 'number' | 'text' | 'select';
    options?: { label: string; value: string }[];
    placeholder?: string;
    defaultValue?: any;
    gridSpan?: number;
};

export type CalculatorConfig = {
    id: string;
    name: string;
    shortName: string;
    description: string;
    seoDescription: string;
    inputs: CalculatorInput[];
    calculate: (inputs: Record<string, any>) => any;
};

// Math Helpers (backed by shared multi-format odds parser)
const decToAmerican = (dec: number) => toAmerican(dec) || '-';
const decToFraction = (dec: number) => toFractional(dec) || '-';

const getDecOdds = (val: string, format: string = 'auto') => {
    const raw = String(val || '').trim();
    if (!raw) return 1;
    if (format === 'probability') {
        const num = parseFloat(raw);
        if (!isNaN(num) && num > 0) return 100 / num;
    }
    // Map calculator format labels onto the shared parser.
    const preferred =
        format === 'fraction' || format === 'fractional' ? 'fractional'
        : format === 'american' ? 'american'
        : format === 'decimal' ? 'decimal'
        : format === 'cents' ? 'cents'
        : 'auto';
    const dec = oddsToDecimal(raw, preferred as any);
    return dec > 1 ? dec : 1;
};

export const CALCULATORS: CalculatorConfig[] = [
    {
        id: 'arbitrage',
        name: 'Arbitrage Calculator',
        shortName: 'Arbitrage',
        description: 'Find risk-free arbitrage opportunities by comparing odds across different bookmakers.',
        seoDescription: 'Calculate guaranteed profits with our free arbitrage betting calculator. Compare odds and find risk-free betting opportunities.',
        inputs: [
            { id: 'odds1', label: 'Odds 1 (Decimal or American)', type: 'text', placeholder: '+110 or 2.10' },
            { id: 'odds2', label: 'Odds 2 (Decimal or American)', type: 'text', placeholder: '-105 or 1.95' },
            { id: 'stake', label: 'Total Stake ($)', type: 'number', defaultValue: 100 }
        ],
        calculate: (vals) => {
            const dec1 = getDecOdds(vals.odds1, vals._oddsFormat);
            const dec2 = getDecOdds(vals.odds2, vals._oddsFormat);
            const stake = parseFloat(vals.stake) || 100;
            
            if (dec1 <= 1 || dec2 <= 1) return { error: 'Please enter valid odds.' };
            
            const p1 = 1 / dec1;
            const p2 = 1 / dec2;
            const totalImplied = p1 + p2;
            const roi = (1 / totalImplied) - 1;
            
            const stake1 = (stake * p1) / totalImplied;
            const stake2 = (stake * p2) / totalImplied;
            const payout = stake1 * dec1;
            const profit = payout - stake;
            
            return {
                result: totalImplied < 1 ? 'Arbitrage Opportunity!' : 'No Arbitrage',
                profit: profit.toFixed(2),
                roi: (roi * 100).toFixed(2) + '%',
                totalImplied: (totalImplied * 100).toFixed(2) + '%',
                stake1: stake1.toFixed(2),
                stake2: stake2.toFixed(2),
                payout: payout.toFixed(2)
            };
        }
    },
    {
        id: 'expected-value',
        name: 'Expected Value (EV) Calculator',
        shortName: 'Expected Value',
        description: 'Calculate the long-term profitability of a bet based on your estimated win probability.',
        seoDescription: 'Find +EV bets with our Expected Value Calculator. Enter your odds and win probability to see the long-term profit of your bet.',
        inputs: [
            { id: 'odds', label: 'Bet Odds', type: 'text', placeholder: '+150 or 2.50' },
            { id: 'prob', label: 'Win Probability (%)', type: 'number', placeholder: '45' },
            { id: 'stake', label: 'Stake ($)', type: 'number', defaultValue: 10 }
        ],
        calculate: (vals) => {
            const dec = getDecOdds(vals.odds, vals._oddsFormat);
            const prob = parseFloat(vals.prob) / 100;
            const stake = parseFloat(vals.stake) || 10;
            
            if (!dec || isNaN(prob)) return { error: 'Please enter valid values.' };
            
            const payout = stake * dec;
            const profitIfWin = payout - stake;
            const ev = (prob * profitIfWin) - ((1 - prob) * stake);
            const evPercent = (ev / stake) * 100;
            
            return {
                result: ev > 0 ? '+EV Bet' : '-EV Bet',
                expectedValue: '$' + ev.toFixed(2),
                evPercentage: evPercent.toFixed(2) + '%',
                profitIfWin: '$' + profitIfWin.toFixed(2)
            };
        }
    },
    {
        id: 'bonus-bet',
        name: 'Bonus Bet Conversion Calculator',
        shortName: 'Bonus Bet',
        description: 'Maximize your free bets by finding the optimal hedge stake to guarantee cash profit.',
        seoDescription: 'Convert free bets to cash guaranteed. Use our Bonus Bet Conversion Calculator to find the optimal hedge size.',
        inputs: [
            { id: 'bonusStake', label: 'Free Bet Amount ($)', type: 'number', defaultValue: 50 },
            { id: 'bonusOdds', label: 'Free Bet Odds', type: 'text', placeholder: '+300 or 4.00' },
            { id: 'hedgeOdds', label: 'Hedge Bet Odds', type: 'text', placeholder: '-250 or 1.40' }
        ],
        calculate: (vals) => {
            const fbStake = parseFloat(vals.bonusStake) || 50;
            const fbDec = getDecOdds(vals.bonusOdds, vals._oddsFormat);
            const hedgeDec = getDecOdds(vals.hedgeOdds, vals._oddsFormat);
            
            if (fbDec <= 1 || hedgeDec <= 1) return { error: 'Please enter valid odds.' };
            
            const fbProfit = fbStake * (fbDec - 1);
            const hedgeStake = fbProfit / hedgeDec;
            const guaranteedProfit = fbProfit - hedgeStake;
            const conversionRate = (guaranteedProfit / fbStake) * 100;
            
            return {
                result: 'Conversion: ' + conversionRate.toFixed(2) + '%',
                hedgeStake: '$' + hedgeStake.toFixed(2),
                guaranteedCash: '$' + guaranteedProfit.toFixed(2)
            };
        }
    },
    {
        id: 'vig',
        name: 'Vig (Margin) Calculator',
        shortName: 'Vig / Margin',
        description: 'Calculate the hidden bookmaker margin (vig or juice) baked into a betting market.',
        seoDescription: 'Calculate bookmaker margins instantly with our Vig Calculator. Find out how much juice you are paying on any market.',
        inputs: [
            { id: 'odds1', label: 'Odds 1', type: 'text', placeholder: '-110' },
            { id: 'odds2', label: 'Odds 2', type: 'text', placeholder: '-110' },
            { id: 'odds3', label: 'Odds 3 (Optional)', type: 'text', placeholder: '' }
        ],
        calculate: (vals) => {
            const p1 = 1 / getDecOdds(vals.odds1, vals._oddsFormat);
            const p2 = 1 / getDecOdds(vals.odds2, vals._oddsFormat);
            let total = p1 + p2;
            
            if (vals.odds3) {
                total += 1 / getDecOdds(vals.odds3, vals._oddsFormat);
            }
            
            const vig = (total - 1) * 100;
            const payoutRate = (1 / total) * 100;
            
            return {
                result: 'Bookmaker Margin: ' + vig.toFixed(2) + '%',
                impliedTotal: (total * 100).toFixed(2) + '%',
                payoutRate: payoutRate.toFixed(2) + '%'
            };
        }
    },
    {
        id: 'no-vig',
        name: 'No-Vig Fair Odds Calculator',
        shortName: 'Fair Odds',
        description: 'Remove the bookmaker margin to find the true implied probability and fair odds of a bet.',
        seoDescription: 'Find the true mathematical odds of any market by removing the bookmaker juice with our No-Vig Fair Odds Calculator.',
        inputs: [
            { id: 'odds1', label: 'Odds 1', type: 'text', placeholder: '-110' },
            { id: 'odds2', label: 'Odds 2', type: 'text', placeholder: '-110' }
        ],
        calculate: (vals) => {
            const dec1 = getDecOdds(vals.odds1, vals._oddsFormat);
            const dec2 = getDecOdds(vals.odds2, vals._oddsFormat);
            const p1 = 1 / dec1;
            const p2 = 1 / dec2;
            const total = p1 + p2;
            
            const trueP1 = p1 / total;
            const trueP2 = p2 / total;
            
            const fairDec1 = 1 / trueP1;
            const fairDec2 = 1 / trueP2;
            
            return {
                result: 'Fair Probability: ' + (trueP1 * 100).toFixed(2) + '%',
                fairOdds1: decToAmerican(fairDec1) + ' (' + fairDec1.toFixed(2) + ')',
                fairOdds2: decToAmerican(fairDec2) + ' (' + fairDec2.toFixed(2) + ')',
                originalVig: ((total - 1) * 100).toFixed(2) + '%'
            };
        }
    },
    {
        id: 'kelly',
        name: 'Kelly Criterion Calculator',
        shortName: 'Kelly Criterion',
        description: 'Calculate the mathematically optimal bet size for your bankroll based on your edge.',
        seoDescription: 'Optimize your bet sizing with the Kelly Criterion Calculator. Maximize bankroll growth while minimizing risk of ruin.',
        inputs: [
            { id: 'bankroll', label: 'Bankroll ($)', type: 'number', defaultValue: 1000 },
            { id: 'odds', label: 'Bet Odds', type: 'text', placeholder: '+150' },
            { id: 'prob', label: 'True Win Probability (%)', type: 'number', placeholder: '45' },
            { id: 'fraction', label: 'Kelly Fraction', type: 'select', options: [
                { label: 'Full Kelly (Aggressive)', value: '1' },
                { label: 'Half Kelly (Standard)', value: '0.5' },
                { label: 'Quarter Kelly (Conservative)', value: '0.25' }
            ], defaultValue: '0.5' }
        ],
        calculate: (vals) => {
            const bankroll = parseFloat(vals.bankroll) || 1000;
            const dec = getDecOdds(vals.odds, vals._oddsFormat);
            const prob = parseFloat(vals.prob) / 100;
            const fraction = parseFloat(vals.fraction) || 0.5;
            
            const b = dec - 1; // Decimal odds profit multiplier
            const q = 1 - prob;
            
            // Kelly formula: f* = (bp - q) / b
            let f = (b * prob - q) / b;
            
            if (f <= 0) {
                return {
                    result: 'Do Not Bet (Negative Edge)',
                    optimalBet: '$0.00',
                    percentage: '0.00%'
                };
            }
            
            f = f * fraction;
            const betAmount = bankroll * f;
            
            return {
                result: 'Optimal Bet: $' + betAmount.toFixed(2),
                percentageOfBankroll: (f * 100).toFixed(2) + '%',
                fullKellyPercent: ((f / fraction) * 100).toFixed(2) + '%'
            };
        }
    },
    {
        id: 'odds-converter',
        name: 'Odds Converter Calculator',
        shortName: 'Odds Converter',
        description: 'Convert between American, Decimal, Fractional, and Implied Probability.',
        seoDescription: 'Convert betting odds instantly between American, Decimal, Fractional formats and Implied Probability.',
        inputs: [
            { id: 'odds', label: 'Enter Any Odds Format', type: 'text', placeholder: '+150 or 2.50 or 3/2' }
        ],
        calculate: (vals) => {
            let input = vals.odds.trim();
            let dec = 0;
            
            if (input.includes('/')) {
                const parts = input.split('/');
                dec = (parseFloat(parts[0]) / parseFloat(parts[1])) + 1;
            } else {
                dec = getDecOdds(input, vals._oddsFormat);
            }
            
            if (isNaN(dec) || dec <= 1) return { error: 'Invalid odds.' };
            
            const american = decToAmerican(dec);
            const implied = (1 / dec) * 100;
            
            return {
                result: 'Decimal: ' + dec.toFixed(2),
                american: american,
                impliedProbability: implied.toFixed(2) + '%',
                fractional: decToFraction(dec)
            };
        }
    },
    {
        id: 'acca',
        name: 'Acca Calculator',
        shortName: 'Acca / Parlay',
        description: 'Calculate the total odds and potential payout of a multi-leg accumulator/parlay.',
        seoDescription: 'Calculate the payout and total odds of your multi-bet accumulators with our free Acca Calculator.',
        inputs: [
            { id: 'stake', label: 'Bet Stake ($)', type: 'number', defaultValue: 10 },
            { id: 'odds1', label: 'Leg 1 Odds', type: 'text', placeholder: '-110' },
            { id: 'odds2', label: 'Leg 2 Odds', type: 'text', placeholder: '+150' },
            { id: 'odds3', label: 'Leg 3 Odds (Optional)', type: 'text', placeholder: '' },
            { id: 'odds4', label: 'Leg 4 Odds (Optional)', type: 'text', placeholder: '' },
            { id: 'odds5', label: 'Leg 5 Odds (Optional)', type: 'text', placeholder: '' }
        ],
        calculate: (vals) => {
            const stake = parseFloat(vals.stake) || 10;
            let totalDec = 1;
            let legs = 0;
            
            for (let i = 1; i <= 5; i++) {
                if (vals['odds'+i]) {
                    totalDec *= getDecOdds(vals['odds'+i]);
                    legs++;
                }
            }
            
            if (legs === 0) return { error: 'Enter at least one leg.' };
            
            const payout = stake * totalDec;
            const profit = payout - stake;
            
            return {
                result: 'Total Payout: $' + payout.toFixed(2),
                totalProfit: '$' + profit.toFixed(2),
                totalOddsDec: totalDec.toFixed(2),
                totalOddsAmerican: decToAmerican(totalDec),
                legCount: legs.toString()
            };
        }
    },
    {
        id: 'implied-probability',
        name: 'Implied Probability Calculator',
        shortName: 'Implied Prob',
        description: 'Convert betting odds into an implied win probability.',
        seoDescription: 'Find the implied probability of any sports bet instantly. Convert odds to percentages to spot betting value.',
        inputs: [
            { id: 'odds', label: 'Betting Odds', type: 'text', placeholder: '+110' }
        ],
        calculate: (vals) => {
            const dec = getDecOdds(vals.odds, vals._oddsFormat);
            if (dec <= 1) return { error: 'Invalid odds.' };
            const implied = (1 / dec) * 100;
            
            return {
                result: implied.toFixed(2) + '%',
                decimalOdds: dec.toFixed(2),
                americanOdds: decToAmerican(dec),
                fractionalOdds: decToFraction(dec)
            };
        }
    },
    {
        id: 'half-point',
        name: 'Half Point Calculator',
        shortName: 'Half Point',
        description: 'Calculate the mathematical value of buying a half point on spreads or totals.',
        seoDescription: 'Is buying a half point worth the juice? Use our Half Point Calculator to find the mathematical value of line shopping.',
        inputs: [
            { id: 'originalOdds', label: 'Original Odds', type: 'text', placeholder: '-110' },
            { id: 'newOdds', label: 'New Odds (After Buying)', type: 'text', placeholder: '-125' },
            { id: 'pushProb', label: 'Push Probability on Half Point (%)', type: 'number', placeholder: '3.5' }
        ],
        calculate: (vals) => {
            const origDec = getDecOdds(vals.originalOdds, vals._oddsFormat);
            const newDec = getDecOdds(vals.newOdds, vals._oddsFormat);
            const push = (parseFloat(vals.pushProb) || 0) / 100;
            
            const origImplied = 1 / origDec;
            const newImplied = 1 / newDec;
            
            // Value of half point = Change in win probability vs change in implied odds cost
            const cost = newImplied - origImplied;
            const value = push; // Rough estimate of win probability gained by avoiding a loss/push
            
            return {
                result: value > cost ? 'Good Value (+EV)' : 'Bad Value (-EV)',
                costInProbability: (cost * 100).toFixed(2) + '%',
                pointValue: (value * 100).toFixed(2) + '%'
            };
        }
    },
    {
        id: 'hold',
        name: 'Hold Calculator',
        shortName: 'Hold %',
        description: 'Calculate the total theoretical hold percentage a sportsbook makes on a market.',
        seoDescription: 'Calculate sportsbook hold percentages instantly. See how much profit the bookie expects to make on a game.',
        inputs: [
            { id: 'odds1', label: 'Side 1 Odds', type: 'text', placeholder: '-110' },
            { id: 'odds2', label: 'Side 2 Odds', type: 'text', placeholder: '-110' },
            { id: 'odds3', label: 'Side 3 Odds (Draw)', type: 'text', placeholder: '+250' }
        ],
        calculate: (vals) => {
            let impliedTotal = 0;
            if (vals.odds1) impliedTotal += 1 / getDecOdds(vals.odds1, vals._oddsFormat);
            if (vals.odds2) impliedTotal += 1 / getDecOdds(vals.odds2, vals._oddsFormat);
            if (vals.odds3) impliedTotal += 1 / getDecOdds(vals.odds3, vals._oddsFormat);
            
            const hold = (1 - (1 / impliedTotal)) * 100;
            
            return {
                result: 'Sportsbook Hold: ' + hold.toFixed(2) + '%',
                totalImplied: (impliedTotal * 100).toFixed(2) + '%',
                payoutPercentage: ((1 / impliedTotal) * 100).toFixed(2) + '%'
            };
        }
    },
    {
        id: 'prediction-market',
        name: 'Prediction Markets Converter',
        shortName: 'Prediction Market',
        description: 'Convert share prices from Kalshi/Polymarket into standard betting odds.',
        seoDescription: 'Convert Kalshi and Polymarket share prices to sports betting odds (American/Decimal) and find cross-market value.',
        inputs: [
            { id: 'price', label: 'Share Price ($0.01 - $0.99)', type: 'number', placeholder: '0.65' }
        ],
        calculate: (vals) => {
            let price = parseFloat(vals.price);
            if (price > 1) price = price / 100; // If they entered 65 instead of 0.65
            if (price <= 0 || price >= 1) return { error: 'Price must be between 0 and 1.' };
            
            const dec = 1 / price;
            
            return {
                result: 'Implied Probability: ' + (price * 100).toFixed(2) + '%',
                americanOdds: decToAmerican(dec),
                decimalOdds: dec.toFixed(2)
            };
        }
    },
    {
        id: 'point-spread',
        name: 'Point Spread Calculator',
        shortName: 'Point Spread',
        description: 'Estimate the implied probability of a specific team winning based on a point spread.',
        seoDescription: 'Convert point spreads into moneyline probabilities. Use our Point Spread Calculator to estimate win likelihood.',
        inputs: [
            { id: 'spread', label: 'Point Spread', type: 'number', placeholder: '-6.5' }
        ],
        calculate: (vals) => {
            const spread = parseFloat(vals.spread) || 0;
            // Very rough NFL empirical approximation: each point is roughly ~3% prob near zero, decaying.
            // This is purely for demonstration of a calculator tool.
            const prob = 0.5 + (Math.abs(spread) * 0.031);
            const cappedProb = Math.min(Math.max(prob, 0.01), 0.99);
            
            const favProb = spread < 0 ? cappedProb : 1 - cappedProb;
            const underdogProb = spread < 0 ? 1 - cappedProb : cappedProb;
            
            const favDec = 1 / favProb;
            const dogDec = 1 / underdogProb;
            
            return {
                result: 'Favorite Win Prob: ' + (favProb * 100).toFixed(2) + '%',
                underdogWinProb: (underdogProb * 100).toFixed(2) + '%',
                impliedFavOdds: decToAmerican(favDec),
                impliedDogOdds: decToAmerican(dogDec)
            };
        }
    },
    {
        id: 'poisson',
        name: 'Poisson Distribution Calculator',
        shortName: 'Poisson Dist',
        description: 'Calculate the probability of exact goals/points being scored based on expected averages.',
        seoDescription: 'Model sports scores with the Poisson Distribution Calculator. Find the probability of exact outcomes based on xG.',
        inputs: [
            { id: 'expected', label: 'Expected Average (e.g. xG)', type: 'number', placeholder: '1.5' },
            { id: 'target', label: 'Target Exact Number', type: 'number', placeholder: '2' }
        ],
        calculate: (vals) => {
            const lambda = parseFloat(vals.expected);
            const k = parseInt(vals.target);
            
            if (isNaN(lambda) || isNaN(k) || k < 0) return { error: 'Invalid inputs.' };
            
            let factorial = 1;
            for (let i = 2; i <= k; i++) factorial *= i;
            
            const prob = (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial;
            const dec = 1 / prob;
            
            return {
                result: 'Probability of exactly ' + k + ': ' + (prob * 100).toFixed(2) + '%',
                fairOdds: decToAmerican(dec) + ' (' + dec.toFixed(2) + ')'
            };
        }
    },
    {
        id: 'round-robin',
        name: 'Round Robin Calculator',
        shortName: 'Round Robin',
        description: 'Calculate the cost and potential return of round robin parlay combinations.',
        seoDescription: 'Calculate Round Robin bets easily. Find out how many combinations and what your total cost will be.',
        inputs: [
            { id: 'legs', label: 'Total Number of Selections', type: 'number', placeholder: '5' },
            { id: 'by', label: 'Parlay Size (By X)', type: 'number', placeholder: '3' },
            { id: 'stake', label: 'Stake per Combination ($)', type: 'number', defaultValue: 5 }
        ],
        calculate: (vals) => {
            const n = parseInt(vals.legs);
            const r = parseInt(vals.by);
            const stake = parseFloat(vals.stake) || 5;
            
            if (isNaN(n) || isNaN(r) || r > n || r <= 1) return { error: 'Invalid combinations.' };
            
            // nCr = n! / (r! * (n-r)!)
            const factorial = (num: number): number => num <= 1 ? 1 : num * factorial(num - 1);
            const combinations = factorial(n) / (factorial(r) * factorial(n - r));
            
            const totalStake = combinations * stake;
            
            return {
                result: 'Total Combinations: ' + Math.round(combinations),
                totalCost: '$' + totalStake.toFixed(2),
                type: n + ' Teams By ' + r + 's'
            };
        }
    }
];
