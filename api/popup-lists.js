// api/popup-lists.js
// Pure data + matchers for popup match qualification.
// No I/O, no side effects — trivially unit-testable.

// 17 European tier-1 clubs. Matches anywhere in home/away name (case + accent insensitive).
export const TOP_CLUBS = [
  // EPL
  'Manchester City', 'Liverpool', 'Arsenal', 'Manchester United',
  'Chelsea', 'Tottenham Hotspur',
  // La Liga
  'Real Madrid', 'Barcelona', 'Atletico Madrid',
  // Serie A
  'Juventus', 'AC Milan', 'Inter Milan', 'Napoli',
  // Bundesliga
  'Bayern Munich', 'Borussia Dortmund',
  // Ligue 1
  'Paris Saint-Germain', 'Olympique de Marseille',
];

// 16 African entries: 7 Zambian Super League clubs + 8 continental giants + Chipolopolo (Zambia national team).
// Note on "Nkana": ESPN returns the club as "Nkana FC"; storing the base name works because
// isInClubList does a substring match against the full ESPN name. Keeping as "Nkana" matches
// the name used in DERBIES below (Kitwe Derby, Zesco Clásico).
export const TOP_CLUBS_AFRICA = [
  // Zambia Super League
  'Zesco United', 'Power Dynamos', 'Nkana', 'Red Arrows',
  'Green Buffaloes', 'Forest Rangers', 'Nkwazi',
  // African continental giants
  'TP Mazembe', 'Al Ahly', 'Zamalek', 'Mamelodi Sundowns',
  'Wydad Casablanca', 'Esperance Tunis', 'Kaizer Chiefs',
  'Orlando Pirates',
  // National side
  'Zambia',
];

// 14 named rivalries. Each entry: {name, teams: [home, away]}.
// Matching is order-independent (either team in either slot qualifies).
export const DERBIES = [
  { name: 'El Clásico',          teams: ['Real Madrid', 'Barcelona'] },
  { name: 'Madrid Derby',        teams: ['Real Madrid', 'Atletico Madrid'] },
  { name: 'Manchester Derby',    teams: ['Manchester City', 'Manchester United'] },
  { name: 'North London Derby',  teams: ['Arsenal', 'Tottenham Hotspur'] },
  { name: 'Merseyside Derby',    teams: ['Liverpool', 'Everton'] },
  { name: 'Old Firm',            teams: ['Celtic', 'Rangers'] },
  { name: 'Der Klassiker',       teams: ['Bayern Munich', 'Borussia Dortmund'] },
  { name: 'Milan Derby',         teams: ['AC Milan', 'Inter Milan'] },
  { name: 'Roma Derby',          teams: ['AS Roma', 'Lazio'] },
  { name: 'Turin Derby',         teams: ['Juventus', 'Torino'] },
  { name: 'Le Classique',        teams: ['Paris Saint-Germain', 'Olympique de Marseille'] },
  { name: 'Kitwe Derby',         teams: ['Nkana', 'Power Dynamos'] },
  { name: 'Lusaka Derby',        teams: ['Red Arrows', 'Green Buffaloes'] },
  { name: 'Zesco Clásico',       teams: ['Zesco United', 'Power Dynamos'] },
];

// Normalize a team name for matching: lowercase, strip diacritics, collapse whitespace.
export function normalizeName(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove combining diacritics
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// True if `teamName` (e.g. an ESPN fixture name like "Real Madrid CF") contains
// any entry from `clubList` as a substring, case- and accent-insensitive.
// Direction matters: the incoming ESPN name is the haystack; each list entry
// is a needle. This lets us use short canonical names in the list and still
// match ESPN's longer variants ("Nkana" → "Nkana FC", "Liverpool" → "Liverpool FC").
export function isInClubList(teamName, clubList) {
  const n = normalizeName(teamName);
  if (!n) return false;
  return clubList.some(c => n.includes(normalizeName(c)));
}

// Returns the DERBIES entry whose teams are (both) present in {home, away},
// or null if no derby matches. Order-independent.
export function findDerby(home, away) {
  const h = normalizeName(home);
  const a = normalizeName(away);
  if (!h || !a) return null;
  for (const d of DERBIES) {
    const [t1, t2] = d.teams.map(normalizeName);
    const match = (h.includes(t1) && a.includes(t2)) || (h.includes(t2) && a.includes(t1));
    if (match) return d;
  }
  return null;
}
