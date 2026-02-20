function parsePrice(amount) {
    if (!amount) return 0;

    let str = String(amount).replace(/FCFA|CFA|F/gi, '').trim();
    let lowerStr = str.toLowerCase();
    let multiplier = 1;
    let hasShorthand = false;

    if (lowerStr.endsWith('m') || lowerStr.includes('mill')) {
        multiplier = 1000000;
        str = str.replace(/m|millions?|mill/gi, '').trim();
        hasShorthand = true;
    } else if (lowerStr.endsWith('k')) {
        multiplier = 1000;
        str = str.replace(/k/gi, '').trim();
        hasShorthand = true;
    }

    let cleaned;
    if (hasShorthand) {
        // For shorthand like 1.5M, treat first . or , as decimal
        cleaned = str.replace(',', '.');
        // Remove spaces and other dots
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            // More than one dot? Probably 1.500.000M (weird but possible)
            cleaned = cleaned.replace(/\./g, '');
        }
    } else {
        // For normal prices like 150.000, remove all separators
        cleaned = str.replace(/[\s.,]/g, '');
    }

    const num = parseFloat(cleaned) * multiplier;
    return isNaN(num) ? 0 : Math.floor(num);
}

function formatPrice(amount) {
    if (!amount) return '0';
    const num = typeof amount === 'number' ? amount : parsePrice(amount);
    return num.toLocaleString('fr-FR');
}

console.log("--- Tests Price Normalization V2 ---");
console.log("1M ->", formatPrice("1M"));
console.log("1.5M ->", formatPrice("1.5M"));
console.log("1,5M ->", formatPrice("1,5M"));
console.log("100k ->", formatPrice("100k"));
console.log("1 000 000 FCFA ->", formatPrice("1 000 000 FCFA"));
console.log("150.000 ->", formatPrice("150.000"));
console.log("150 000 ->", formatPrice("150 000"));
console.log("100 millions ->", formatPrice("100 millions"));
console.log("100.5 millions ->", formatPrice("100.5 millions"));
