import React from 'react';

export const CalculatorContent: Record<string, React.ReactNode> = {
    'arbitrage': (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 text-[#121212]">
            <h2 className="text-2xl font-bold">How does the Arbitrage Calculator work?</h2>
            <p className="text-[15px] text-gray-600 leading-relaxed">
                Arbitrage betting (or &quot;arbing&quot;) is a mathematically guaranteed way to lock in a profit regardless of the outcome of a sporting event. This happens when different bookmakers offer differing odds on the same event, creating a gap where the implied probability is less than 100%. Our Arbitrage Calculator helps you find the exact stakes needed to guarantee this profit.
            </p>
            
            <h3 className="text-xl font-bold mt-8">Example of Arbitrage Betting</h3>
            <p className="text-[15px] text-gray-600 leading-relaxed">
                Imagine an upcoming Premier League match between Arsenal and Chelsea. 
                <br /><br />
                Bookmaker A offers odds of <strong>2.10 (11/10)</strong> for Arsenal to win (Draw No Bet).
                <br />
                Bookmaker B offers odds of <strong>2.05 (21/20)</strong> for Chelsea to win (Draw No Bet).
                <br /><br />
                If you have a total bankroll of £100 to stake, the calculator determines how to split it to ensure equal profit:
            </p>
            <ul className="list-disc pl-5 text-[15px] text-gray-600 space-y-2">
                <li>Stake £49.40 on Arsenal at 2.10 (11/10)</li>
                <li>Stake £50.60 on Chelsea at 2.05 (21/20)</li>
            </ul>
            <p className="text-[15px] text-gray-600 leading-relaxed">
                No matter who wins, your return will be <strong>£103.73</strong>. Since your total stake was £100, you have locked in a guaranteed risk-free profit of <strong>£3.73</strong> (a 3.73% return on investment).
            </p>

            <div className="border-t border-gray-100 pt-8 mt-8">
                <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
                <div className="space-y-6">
                    <div>
                        <h4 className="text-[16px] font-bold">What is an arbitrage opportunity?</h4>
                        <p className="text-[14px] text-gray-600 mt-2">
                            An arbitrage opportunity arises when bookmakers have opposing views on an outcome, or when one bookmaker is slow to update their odds. By covering all possible outcomes across different bookmakers, you guarantee a profit.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-[16px] font-bold">Can bookmakers ban me for arbing?</h4>
                        <p className="text-[14px] text-gray-600 mt-2">
                            Yes. Bookmakers do not like arbitrage bettors because they only take profitable bets. If a bookmaker suspects you are consistently beating their closing line or exclusively betting on arbs, they may restrict your stakes (gubbing) or close your account.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-[16px] font-bold">What is implied probability?</h4>
                        <p className="text-[14px] text-gray-600 mt-2">
                            Implied probability is the conversion of betting odds into a percentage chance of an outcome happening. If the combined implied probabilities of all possible outcomes in a market add up to less than 100%, an arbitrage opportunity exists.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    ),
    'expected-value': (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 text-[#121212]">
            <h2 className="text-2xl font-bold">How does the Expected Value (EV) Calculator work?</h2>
            <p className="text-[15px] text-gray-600 leading-relaxed">
                Expected Value (EV) is the most critical concept in sports betting. It tells you exactly how much money you can expect to win or lose on a bet over the long term. A positive Expected Value (+EV) implies a profitable bet over time, whereas a negative Expected Value (-EV) means the bet will lose money in the long run.
            </p>
            
            <h3 className="text-xl font-bold mt-8">Example of Expected Value Betting</h3>
            <p className="text-[15px] text-gray-600 leading-relaxed">
                Let&apos;s look at a match between Manchester City and Liverpool. You believe Manchester City has a 50% true probability of winning the game. 
                <br /><br />
                A bookmaker is offering odds of <strong>2.20 (6/5)</strong> on Manchester City.
                <br />
                If you place a £10 stake, your potential profit is £12 (total payout £22).
                <br /><br />
                Using the EV formula: <em>(Probability of Winning x Amount Won per bet) - (Probability of Losing x Amount Lost per bet)</em>
            </p>
            <ul className="list-disc pl-5 text-[15px] text-gray-600 space-y-2">
                <li>Win scenario: 50% chance to win £12 = £6.00</li>
                <li>Loss scenario: 50% chance to lose £10 = -£5.00</li>
            </ul>
            <p className="text-[15px] text-gray-600 leading-relaxed">
                Your Expected Value is <strong>£6.00 - £5.00 = £1.00</strong>. This means that for every £10 you bet at these odds, you will theoretically make £1.00 in profit over the long run.
            </p>

            <div className="border-t border-gray-100 pt-8 mt-8">
                <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
                <div className="space-y-6">
                    <div>
                        <h4 className="text-[16px] font-bold">What is expected value in sports betting?</h4>
                        <p className="text-[14px] text-gray-600 mt-2">
                            Expected value in sports betting is a measure of what a bettor can expect to win or lose per bet placed on the same odds over and over again. It is the mathematical edge you have against the bookmaker.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-[16px] font-bold">How do you calculate EV for a sports bet?</h4>
                        <p className="text-[14px] text-gray-600 mt-2">
                            To calculate EV, multiply your probability of winning by the potential profit, and subtract the probability of losing multiplied by your stake. Formula: (Win % x Profit) - (Loss % x Stake). Our calculator does this for you automatically.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-[16px] font-bold">What is a good expected value percentage?</h4>
                        <p className="text-[14px] text-gray-600 mt-2">
                            Any positive percentage (+EV) is mathematically profitable in the long run. Professional bettors typically look for edges between 2% and 5%. Consistent 3% EV bets will result in massive bankroll growth over hundreds of bets.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    ),
    'bonus-bet': (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 text-[#121212]">
            <h2 className="text-2xl font-bold">How does the Bonus Bet Conversion Calculator work?</h2>
            <p className="text-[15px] text-gray-600 leading-relaxed">
                When a bookmaker gives you a &quot;Free Bet&quot; or &quot;Bonus Bet&quot;, the stake is usually not returned in your winnings. The Free Bet Conversion Calculator helps you extract guaranteed cash from these offers using matched betting strategies, typically aiming to convert at least 70-80% of the free bet value into real cash.
            </p>
            <p className="text-[15px] text-gray-600 leading-relaxed">
                For example, if you place a £50 free bet on Tottenham at <strong>4.00 (3/1)</strong>, and hedge the opposite outcome on an exchange at <strong>4.10 (31/10)</strong>, you can lock in around £35 in risk-free cash regardless of the match result.
            </p>
        </div>
    ),
    'kelly': (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 text-[#121212]">
            <h2 className="text-2xl font-bold">How does the Kelly Criterion Calculator work?</h2>
            <p className="text-[15px] text-gray-600 leading-relaxed">
                The Kelly Criterion is a mathematical formula used by professional bettors to determine the optimal size of a series of bets. It balances the potential for massive bankroll growth with the risk of ruin. 
            </p>
            <p className="text-[15px] text-gray-600 leading-relaxed">
                If you have an edge on a bet (e.g. Manchester United at <strong>2.50 (6/4)</strong> when they should be <strong>2.00 (1/1)</strong>), the Kelly formula tells you exactly what percentage of your £1,000 bankroll to stake to maximize long-term compounding growth. Many bettors use &quot;Half Kelly&quot; to reduce volatility while still achieving excellent growth.
            </p>
        </div>
    ),
    'no-vig': (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 text-[#121212]">
            <h2 className="text-2xl font-bold">How does the No-Vig Fair Odds Calculator work?</h2>
            <p className="text-[15px] text-gray-600 leading-relaxed">
                Bookmakers make money by charging a fee called the &quot;vig&quot;, &quot;margin&quot;, or &quot;juice&quot;, which is baked into the odds. The No-Vig calculator removes this artificial margin to reveal the true implied probability of an event happening.
            </p>
            <p className="text-[15px] text-gray-600 leading-relaxed">
                For example, if standard lines are <strong>1.91 (10/11)</strong> on both sides of an Over/Under goals market for Newcastle vs Aston Villa, the total implied probability is 104.7%. By removing the vig, the true &quot;fair odds&quot; are exactly <strong>2.00 (1/1)</strong> on both sides (50% true probability).
            </p>
        </div>
    ),
    'odds-converter': (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 text-[#121212]">
            <h2 className="text-2xl font-bold">How does the Odds Converter work?</h2>
            <p className="text-[15px] text-gray-600 leading-relaxed">
                Different regions use different odds formats. The UK uses Fractional odds (e.g. <strong>2/1</strong>), Europe and Australia use Decimal odds (e.g. <strong>3.00</strong>), and the US uses American odds (e.g. <strong>+200</strong>). Our converter allows you to seamlessly translate between these formats and instantly see the implied probability.
            </p>
        </div>
    )
};
