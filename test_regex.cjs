const str = "[CONFIDENTIEL_NE_PAS_COMMUNIQUER_AU_PROSPECT — Agent: Wilfried / Tel: 22507070707]";
const regex = /CONFIDENTIEL_NE_PAS_COMMUNIQUER_AU_PROSPECT[^:]*—\s*Agent:\s*([^/\\]+)\s*\/\s*Tel:\s*([^\]\\]+)/i;
const match = str.match(regex);
console.log(match ? 'Match: ' + match[2] : 'No match');
