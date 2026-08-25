// Authoritative country -> region map so a single "Region" selection (e.g. "Europe") expands to
// every country in that region without the user hand-picking them. Football confederations are
// preferred over strict geography where the two disagree, because the data is league-driven:
//   * Turkey, Russia, Kazakhstan, Georgia, Armenia, Azerbaijan, Israel, Cyprus -> Europe (UEFA)
//   * Australia -> Oceania (geographic intuition wins here; the data labels it as a country, and a
//     user selecting "Oceania" expects it)
// The continental label "Europe" (UEFA club comps carry country="Europe") folds into Europe;
// truly cross-continental labels ("International", "International Clubs", "World") get their own
// International bucket. Non-geographic leakage (UFC/MMA/tennis tours/esports) and blanks -> Other.

export type Region =
    | 'Europe' | 'Asia' | 'Africa' | 'North America' | 'South America' | 'Oceania' | 'International' | 'Other';

// Display order used by the facet/breakdown when present.
export const REGION_ORDER: Region[] = [
    'Europe', 'South America', 'North America', 'Asia', 'Africa', 'Oceania', 'International', 'Other',
];

const REGION_COUNTRIES: Record<Exclude<Region, 'Other'>, string[]> = {
    Europe: [
        'Europe', 'Albania', 'Andorra', 'Armenia', 'Austria', 'Azerbaijan', 'Belarus', 'Belgium',
        'Bosnia and Herzegovina', 'Bosnia', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Czechia',
        'Denmark', 'England', 'Estonia', 'Faroe Islands', 'Finland', 'France', 'Georgia', 'Germany',
        'Gibraltar', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Republic of Ireland', 'Israel', 'Italy',
        'Kazakhstan', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Moldova',
        'Monaco', 'Montenegro', 'Netherlands', 'North Macedonia', 'Macedonia', 'Northern Ireland', 'Norway',
        'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino', 'Scotland', 'Serbia', 'Slovakia', 'Slovenia',
        'Spain', 'Sweden', 'Switzerland', 'Turkey', 'Ukraine', 'Wales', 'UK', 'United Kingdom', 'Great Britain',
    ],
    Asia: [
        'Afghanistan', 'Bahrain', 'Bangladesh', 'Bhutan', 'Brunei', 'Cambodia', 'China', 'Hong Kong', 'India',
        'Indonesia', 'Iran', 'Iraq', 'Japan', 'Jordan', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Lebanon', 'Macau',
        'Malaysia', 'Maldives', 'Mongolia', 'Myanmar', 'Nepal', 'North Korea', 'Oman', 'Pakistan', 'Palestine',
        'Philippines', 'Qatar', 'Saudi Arabia', 'Singapore', 'South Korea', 'Korea Republic', 'Sri Lanka',
        'Syria', 'Taiwan', 'Chinese Taipei', 'Tajikistan', 'Thailand', 'Timor-Leste', 'Turkmenistan',
        'United Arab Emirates', 'UAE', 'Uzbekistan', 'Vietnam', 'Yemen',
    ],
    Africa: [
        'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon', 'Cape Verde',
        'Central African Republic', 'Chad', 'Comoros', 'Congo', 'DR Congo', 'DR Congo', 'Congo DR',
        'Democratic Republic of the Congo', 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini',
        'Swaziland', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Ivory Coast',
        "Cote d'Ivoire", 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania',
        'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'Senegal', 'Seychelles',
        'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia',
        'Uganda', 'Zambia', 'Zimbabwe',
    ],
    'North America': [
        'Canada', 'USA', 'United States', 'United States of America', 'US', 'Mexico', 'Costa Rica', 'Panama',
        'Honduras', 'Guatemala', 'El Salvador', 'Nicaragua', 'Belize', 'Jamaica', 'Trinidad and Tobago',
        'Haiti', 'Dominican Republic', 'Cuba', 'Curacao', 'Bahamas', 'Barbados', 'Guadeloupe', 'Martinique',
        'Puerto Rico', 'Grenada', 'Saint Lucia', 'Saint Kitts and Nevis', 'Antigua and Barbuda', 'Bermuda',
    ],
    'South America': [
        'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Guyana', 'Paraguay', 'Peru',
        'Suriname', 'Uruguay', 'Venezuela',
    ],
    Oceania: [
        'Australia', 'New Zealand', 'Fiji', 'Papua New Guinea', 'Samoa', 'Tonga', 'Tahiti', 'Vanuatu',
        'Solomon Islands', 'New Caledonia', 'Cook Islands', 'American Samoa',
    ],
    International: [
        'International', 'International Clubs', 'World', 'Intercontinental',
    ],
};

function fold(value: string): string {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[.']/g, '')
        .replace(/\s*&\s*/g, ' and ')
        .replace(/\s+/g, ' ')
        .trim();
}

const REGION_BY_COUNTRY = new Map<string, Region>();
for (const [region, countries] of Object.entries(REGION_COUNTRIES) as [Region, string[]][]) {
    for (const c of countries) REGION_BY_COUNTRY.set(fold(c), region);
}

/** Region for a country string. Unrecognised / blank / non-geographic values -> 'Other'. */
export function regionOf(country: string | null | undefined): Region {
    const key = fold(country || '');
    if (!key || key === 'unknown' || key === 'unknown country') return 'Other';
    return REGION_BY_COUNTRY.get(key) || 'Other';
}
