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

    // Supprimer les suffixes WhatsApp (@s.whatsapp.net, @c.us, @g.us, @lid, etc.)
    let p = String(raw).split('@')[0];
    // Garder uniquement les chiffres
    p = p.replace(/[^0-9]/g, '');
    if (!p) return '';

    // Rejeter les LID WhatsApp (longueur > 15 chiffres = hash interne)
    if (p.length > 15) return '';

    // 15 chiffres avec préfixe 00225 → supprimer le double zéro (00225XXXXXXXXXX)
    if (p.length === 15 && p.startsWith('00225')) return p.substring(2); // → 2250XXXXXXXXXX (13 chiffres)

    // 8 chiffres = ancien format ivoirien → ajouter 225
    if (p.length === 8) return '225' + p;

    // 9 chiffres → ajouter 2250 pour obtenir 13 chiffres
    if (p.length === 9) return '2250' + p;

    // 10 chiffres: commence par 0 (format local) → ajouter 225 devant (total 13)
    if (p.length === 10 && p.startsWith('0')) return '225' + p;

    // 10 chiffres: sans le 0 (format ivoirien abrégé) → ajouter 2250 (total 14? non: 225+10=13)
    if (p.length === 10) return '225' + p;

    // 11 chiffres: vérifie si c'est 225+8 chiffres (ex: 22501234567)
    if (p.length === 11 && p.startsWith('225')) return p;

    // 12 chiffres avec 225 (ancien format complet CI) → utiliser tel quel
    if (p.length === 12 && p.startsWith('225')) return p;

    // 13 chiffres (225 + 10 chiffres complets) → utiliser tel quel
    if (p.length === 13 && p.startsWith('225')) return p;

    // 14 chiffres: LID WhatsApp ou numéro international non-CI → retourner vide pour signaler invalide
    if (p.length >= 14) return '';

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
    // 13 chiffres: 225 + 10 digits (nouveau format CI: 2250XXXXXXXXX)
    if (phone.length === 13 && phone.startsWith('225')) {
        const local = phone.substring(3);
        return `+225 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
    }
    // 12 chiffres: 225 + 9 digits (ancien format CI)
    if (phone.length === 12 && phone.startsWith('225')) {
        const local = phone.substring(3);
        return `+225 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8)}`;
    }
    return '+' + phone;
}

/**
 * Vérifie si un numéro est un LID WhatsApp (pas un vrai numéro de téléphone)
 * Un LID est un identifiant interne WhatsApp, pas un numéro réel.
 */
export function isLID(raw) {
    if (!raw) return true;
    const p = formatPhoneCI(raw);
    // formatPhoneCI retourne '' pour les LIDs (>15 chiffres ou >=14 non-CI)
    if (!p) return true;
    // Longueur invalide pour un numéro de téléphone
    if (p.length < 8 || p.length > 13) return true;
    // Un vrai numéro CI doit commencer par 225 s'il a 11+ chiffres
    if (p.length >= 11 && !p.startsWith('225')) return true;
    return false;
}

/**
 * Extrait un numéro de téléphone depuis le texte d'un message.
 * Recherche les formats ivoiriens courants:
 *   - 07 XX XX XX XX (10 chiffres)
 *   - 0707070707 (compact)
 *   - 07.07.07.07.07 (points)
 *   - 07-07-07-07-07 (tirets)
 *   - +225 07 XX XX XX XX (international)
 * Retourne le premier numéro valide trouvé (formaté), ou '' sinon.
 */
export function extractPhoneFromMessage(text) {
    if (!text || typeof text !== 'string') return '';

    const cleanText = text.replace(/\s+/g, ' ');

    const patterns = [
        // Format international avec +225, 00225, ou 225
        /(?:\+225|00225|225)[\s.\-/]*([0-9][\s.\-/]*\d{2}[\s.\-/]*\d{2}[\s.\-/]*\d{2}[\s.\-/]*\d{2}(?:\d{2})?)/g,
        // Format local 10 chiffres commençant par 0: 07, 05, 01, 08, 27, 57, 47, 45, etc.
        /(?:^|\s|:|\/|\(|-)?(0[0-9][\s.\-/]*\d{2}[\s.\-/]*\d{2}[\s.\-/]*\d{2}[\s.\-/]*\d{2})\b/g,
        // Tous les préfixes CI 2 chiffres connus (Orange: 05,07,57,47 | MTN: 01,06,56,66 | Moov: 08 | Wave: 27,44,45,46)
        /\b((?:01|04|05|06|07|08|21|25|27|44|45|46|47|55|56|57|66|67)\d{6,8})\b/g
    ];

    for (const regex of patterns) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(cleanText)) !== null) {
            const raw = match[1] || match[0];
            const cleaned = raw.replace(/[^0-9]/g, '');
            const formatted = formatPhoneCI(cleaned);
            if (formatted && !isLID(formatted)) {
                return formatted;
            }
        }
    }

    const numbersOnly = text.replace(/[^0-9]/g, ' ');
    const potentialNumbers = numbersOnly.match(/\b(\d{8,11})\b/g);
    if (potentialNumbers) {
        for (const num of potentialNumbers) {
            const formatted = formatPhoneCI(num);
            if (formatted && !isLID(formatted)) {
                return formatted;
            }
        }
    }

    return '';
}

/**
 * Alias: formatPhoneDisplay — format for display (human-readable)
 * Delegates to displayPhone() which is the canonical implementation.
 */
export const formatPhoneDisplay = displayPhone;

/**
 * Alias: formatWhatsAppLink — returns a wa.me URL for a given phone
 * Delegates to whatsappLink() which is the canonical implementation.
 */
export const formatWhatsAppLink = whatsappLink;

export function extractBestPhone(obj) {
    if (!obj) return '';

    // Priorité: telephone_expediteur = numéro WhatsApp de celui qui a posté dans le groupe
    // telephone_bien = numéro extrait par l'IA (souvent vide ou identique à telephone_expediteur)
    const candidates = [
        obj?.cleanedSenderPn,
        obj?.telephoneExpediteur,
        obj?.telephone_expediteur,
        obj?.telephoneBien,
        obj?.telephone_bien,
        obj?.telephone,
        obj?.numero,
        obj?.contact,
    ];

    for (const val of candidates) {
        if (!val) continue;
        const formatted = formatPhoneCI(String(val));
        if (formatted && !isLID(formatted)) return formatted;
    }

    // Dernier recours: historique des partages (shares)
    if (Array.isArray(obj?.shares) && obj.shares.length > 0) {
        for (const share of obj.shares) {
            const tel = share?.telephone || share?.from || share?.sender || '';
            if (tel) {
                const formatted = formatPhoneCI(String(tel));
                if (formatted && !isLID(formatted)) return formatted;
            }
        }
    }

    return '';
}
