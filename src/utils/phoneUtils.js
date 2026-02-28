/**
 * phoneUtils.js - Utilitaire centralisé pour la gestion des numéros de téléphone
 * Format cible: Côte d'Ivoire (+225) → 2250XXXXXXXXX (13 chiffres)
 */

/**
 * Formate un numéro brut vers le format WhatsApp CI (225XXXXXXXXX)
 * Gère les suffixes @s.whatsapp.net, @c.us, @g.us, @lid
 */
export function formatPhoneCI(raw) {
    if (!raw) return '';

    // Supprimer les suffixes WhatsApp
    let p = String(raw).split('@')[0];
    // Garder uniquement les chiffres
    p = p.replace(/[^0-9]/g, '');
    if (!p) return '';

    // 8 chiffres = ancien format ivoirien → ajouter 225
    if (p.length === 8) return '225' + p;

    // 9 chiffres sans indicatif → ajouter 225
    if (p.length === 9) return '225' + p;

    // 10 chiffres: commence par 0 (format local) → remplacer 0 par 225
    if (p.length === 10) {
        if (p.startsWith('0')) return '225' + p.substring(1);
        return '225' + p;
    }

    // 12 chiffres avec 225 (format complet CI) → utiliser tel quel
    if (p.length === 12 && p.startsWith('225')) return p;

    // 13 chiffres (225 + 10 chiffres) → utiliser tel quel
    if (p.length === 13 && p.startsWith('225')) return p;

    return p;
}

/**
 * Crée un lien WhatsApp cliquable depuis un numéro brut
 */
export function whatsappLink(raw, message = '') {
    const phone = formatPhoneCI(raw);
    if (!phone) return '#';
    const encodedMsg = message ? `?text=${encodeURIComponent(message)}` : '';
    return `https://wa.me/${phone}${encodedMsg}`;
}

/**
 * Affiche un numéro en format lisible: +225 07 XX XX XX XX
 */
export function displayPhone(raw) {
    const phone = formatPhoneCI(raw);
    if (!phone) return '';
    if (phone.length === 12 && phone.startsWith('225')) {
        const local = phone.substring(3);
        return `+225 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8)}`;
    }
    return '+' + phone;
}

/**
 * Vérifie si un numéro est un LID WhatsApp (pas un vrai numéro)
 */
export function isLID(raw) {
    if (!raw) return true;
    const p = formatPhoneCI(raw);
    return !p || p.length < 10 || p.length > 13;
}

/**
 * Extrait le meilleur numéro disponible depuis un objet (propriété, visite, etc.)
 * Priorise: telephoneBien → telephoneExpediteur → telephone → numero
 */
export function extractBestPhone(obj) {
    const candidates = [
        obj?.telephoneBien,
        obj?.telephoneExpediteur,
        obj?.telephone,
        obj?.numero,
        obj?.telephone_bien,
        obj?.telephone_expediteur,
    ];
    for (const c of candidates) {
        const formatted = formatPhoneCI(c);
        if (formatted && !isLID(formatted)) return formatted;
    }
    return '';
}
