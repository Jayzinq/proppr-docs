# Player Bot - Settings & Alerts

## /settings Menu

Configure via Telegram's inline keyboard in /settings.

### Alert Filters

| Setting | Default | Notes |
|---|---|---|
| Min/Max Odds | No limit | Filter ranges you won't bet. Recommended: 1.50–10.0 |
| Minimum Value % | 0% (all alerts) | Most users set 15–25% |
| Min Average Minutes | 0 min | **Biggest impact on volume.** Start at 45 min |
| Last 5 vs Last 10 | Last 10 | Last 5 = recent form, Last 10 = stable sample |
| Timezone | UTC | Affects all fixture times |

### Market Toggles (/markets)

Enable only markets you bet. Key available markets:
- Anytime Goalscorer ✅
- Shots on Target ✅
- Total Shots ✅
- To be Booked ✅
- Tackles ✅
- Fouls ✅
- Assists
- Goalkeeper Saves
- Score or Assist
- Shots Outside Box

### Automated Alerts

Use `/toggle` to turn push alerts on/off.

- **📉 Price Drop:** Odds on an existing alert shortened - act quickly
- **Muting:** Mute fixtures inline from the alert. Manage with `/unmute`

## Unit Sizing & Bankroll

1u = your personal standard stake size.

| Stake | Used For |
|---|---|
| 0.2u–0.5u | Low confidence / high odds longshots |
| 0.5u–1.0u | Standard value plays |
| 1.0u–1.5u | High value + high probability combined |

**Community guideline:** Never stake >1–2% of total bankroll per bet.

## Early Research Commands

- `/today` - All today's fixtures with rotation warnings
- `/tomorrow` - Get ahead of the market before odds sharpen
- `/value` - Current top EV plays across all markets (Club Legend)
