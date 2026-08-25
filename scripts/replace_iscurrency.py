import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Add getCurrencySymbol helper if not exists
    if 'function getCurrencySymbol' not in content:
        helper = """
function getCurrencySymbol(code: string | undefined) {
    if (!code) return '£';
    if (code === 'GBP') return '£';
    if (code === 'USD') return '$';
    if (code === 'EUR') return '€';
    if (code === 'AUD') return 'A$';
    return code;
}
"""
        # Inject right after imports
        content = re.sub(r'(import .*?;?\n+)+', lambda m: m.group(0) + helper, content)

    # Replace isCurrency logic
    old_iscurrency = r"const isCurrency = bankroll\?\.type === 'currency' \|\| \(bankroll\?\.type !== 'units' && bankroll\?\.currency && bankroll\.currency !== 'u' && bankroll\.currency !== 'Units'\);"
    new_iscurrency = """const typeLower = String(bankroll?.type || '').toLowerCase();
    const isCurrency = typeLower === 'currency' || typeLower === 'cash' || typeLower === 'money' || (typeLower !== 'units' && bankroll?.currency && bankroll.currency !== 'u' && bankroll.currency !== 'Units');"""
    content = re.sub(old_iscurrency, new_iscurrency, content)

    # Replace currencySymbol assignment in bets/page.tsx and analytics/page.tsx
    old_symbol = r"const symbol = isCurrency \? \(bankroll\.currency \|\| '£'\) : 'u';"
    new_symbol = "const symbol = isCurrency ? getCurrencySymbol(bankroll?.currency) : 'u';"
    content = re.sub(old_symbol, new_symbol, content)
    
    old_currencySymbol = r"const currencySymbol = isCurrency \? \(bankroll\.currency \|\| '£'\) : 'u';"
    new_currencySymbol = "const currencySymbol = isCurrency ? getCurrencySymbol(bankroll?.currency) : 'u';"
    content = re.sub(old_currencySymbol, new_currencySymbol, content)

    with open(filepath, 'w') as f:
        f.write(content)

process_file('src/app/track/bets/page.tsx')
process_file('src/app/track/analytics/page.tsx')
