# Team Bot - Insights & Streaks

## /streak - Historical Pattern Detection

Type `/streak` with no arguments. The bot scans every fixture today to find the longest ongoing statistical streaks automatically - no manual team selection needed. Home/Away splits are calculated separately.

### Reading Streak Output

```
🔥 STREAK ANOMALY ALERT
🏟 Burnley vs Middlesborough | Championship

📊 Team Corners - Burnley (Home)
🔥 Streak: 7 Consecutive Matches
📈 Threshold: Over 5.5 Corners

          O5.5   O6.5   O7.5
Hit Rate: 7/7    5/7    4/7
Proj:     6.8    6.8    6.8

Per Match: 7, 8, 6, 9, 5, 6, 7 (most recent left)
```

**Streak Count** - consecutive matches where threshold was beaten.
**Hit Rate** - wins at each threshold. Useful for handicap selection.
**Per Match** - actual values, left = most recent.

## Anomaly Types

### Corner Anomalies
Teams consistently beating corner handicaps in home/away splits.
*"Bayer Leverkusen has cleared Team Corners Over 6.5 in their last 6 Home fixtures."*

### Card Disparities
Teams consistently receiving more cards than their opponent.
*"Getafe has received more Booking Points than their opponent in 80% of matches with this referee."*

### First Half Action
Teams starting fast or conceding early.
*"Aston Villa matches have seen Over 1.5 First Half Goals in 5 consecutive away games."*

### Shot Volume Patterns
Teams consistently exceeding their shot projection.
*"Brighton have recorded Over 6.5 Shots on Target in their last 5 home games."*

## /stats - Global Projections

`/stats` gives a ranked list of today's top projections for any stat. Available categories:

Total Goals, Team Total Goals, Total Corners, Team Corners, Corners Spread, Total Cards, Team Cards, Bookings Spread, Total Shots, Team Shots on Target, Fouls, Tackles, Offsides, Throw-ins, Free Kicks, Saves (Goalkeeper), Team Most statistics.

## /live - In-Play Monitoring

Once you have pre-match over bets placed, use `/live` to monitor in real-time.

1. Select a live fixture from the menu
2. View current live stats vs projections
3. When a threshold is hit, the bot notifies you immediately
4. Catch wins before full-time rather than waiting for settlement

> **Important:** Streaks are a guide, not a guarantee. Always pair with a value check via `/value` or `/fixture` before placing bets.
