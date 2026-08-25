# Player Bot Guide - Proppr Docs

**@PropprPlayerBot** - Individual player prop value betting using the Cerebro statistical model.

## The Cerebro Model

Cerebro is a hard-coded statistical model (not AI/ML) that analyzes player performance data to find mispricings between bookmaker odds and true probability.

- **Data:** Last 5 or Last 10 games per player
- **Position Intelligence:** Primary + alternative positions modeled separately
- **Opponent Adjustment:** Opponent strength factored in
- **Confidence:** 60–70% model confidence on value plays

**Value Formula:** `Value % = ((Bookmaker Odds ÷ Model Odds) − 1) × 100`

## Markets Covered

- Anytime Goalscorer
- Shots on Target
- Total Shots
- To be Booked (Cards)
- Tackles
- Fouls
- Assists
- Goalkeeper Saves
- Score or Assist
- Shots Outside Box

## Key Features

### Real-Time Value Alerts
Instant push notifications when a mispriced market appears. 📉 = odds have shortened, act fast.

### /fixture - Deep-Dive Any Game (Club Legend)
Returns all value alerts matching your settings for a specific match in under 60 seconds. Most popular command.

### Super Sub Strategy
/supersub, /supersubteam, /supersubleague - surface bench players with value. Fresh legs against tired defenses at prices the market ignores.

### Position-Based Modeling
Primary and alternative positions modeled separately for more accurate probability estimates.

## Commands Overview

- `/value` - Top EV plays today/tomorrow/7 days
- `/fixture [match]` - Full analysis for a specific game
- `/player [name]` - Stats and projections for a specific player
- `/top` - Top global player projections by stat
- `/topteam [team]` - Top projections for a team's players
- `/topleague [league]` - Top projections within a league
- `/supersub` - Best bench player value plays
- `/today` / `/tomorrow` - Browse upcoming fixtures
- `/settings` - Configure all filters
- `/markets` - Toggle markets on/off
- `/track` - Bet history and P&L
- `/stats` - Your usage statistics
- `/tutorial` - Interactive setup guide

## Settings

- **Min/Max Odds:** Filter odds ranges you won't bet
- **Minimum Value %:** Edge threshold (recommended: 15–25%)
- **Min Average Minutes:** Filter out low-playtime players (recommended: 45–60 min)
- **Last 5 vs Last 10:** Historical window for calculations
- **Timezone:** All times shown in your local timezone

## Subscription Tiers

| Tier | Price (weekly · monthly · yearly) |
|---|---|
| Reserve | Free |
| Bench Player | £2.99/wk · £9.99/mo · £124.99/yr |
| Regular Starter | £6.99/wk · £23.99/mo · £311.99/yr |
| Club Legend | £9.99/wk · £35.99/mo · £467.99/yr |

### Bundles & Deals

| Package | Price (weekly · monthly · yearly) |
|---|---|
| Club Legend Bundle (Player + Team) | £11.99/wk · £45.99/mo · £592.99/yr |
| Lifetime - All Bots | £429.99 one-time |

Full documentation: https://docs.proppr.io/player-bot
