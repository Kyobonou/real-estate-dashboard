
import { jsPDF } from "jspdf";
import bogbesLogoUrl from "../assets/bogbes-logo.jpg";

class PdfService {
    constructor() {
        this._logoBase64 = null;
        this._loadLogo();
    }

    /** Pre-load the logo as a base64 data-URL so jsPDF can embed it. */
    _loadLogo() {
        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);
                    this._logoBase64 = canvas.toDataURL("image/jpeg", 0.92);
                } catch (e) {
                    console.warn("PdfService: canvas logo conversion failed", e);
                }
            };
            img.onerror = () => console.warn("PdfService: logo image failed to load");
            img.src = bogbesLogoUrl;
        } catch (err) {
            console.warn("PdfService: impossible de charger le logo", err);
        }
    }

    // ─── HELPERS ──────────────────────────────────────────────────────────────

    /** Draw a filled rectangle with border */
    _fieldBox(doc, x, y, w, h, fill = [230, 230, 230]) {
        doc.setDrawColor(180);
        doc.setFillColor(...fill);
        doc.setLineWidth(0.3);
        doc.rect(x, y, w, h, "FD");
    }

    /** Label above a field box */
    _label(doc, text, x, y) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(80);
        doc.text(text, x, y);
    }

    /** Bold value inside a field box */
    _value(doc, text, x, y) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(0);
        doc.text(text || "", x, y);
    }

    // ─── BON DE VISITE — Reconnaissance d'indications et de visite ────────

    /** Build the visit voucher PDF document and return the jsPDF instance. */
    _buildVisitVoucher(visitData) {
        const doc = new jsPDF();
        const w = doc.internal.pageSize.getWidth();   // 210
        const h = doc.internal.pageSize.getHeight();   // 297
        const ml = 15; // margin left
        const mr = 15; // margin right
        const cw = w - ml - mr; // content width

        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear();

        // ── 1. LOGO (top-left)
        if (this._logoBase64) {
            doc.addImage(this._logoBase64, "JPEG", ml, 8, 35, 35);
        }

        // ── 2. TITLE (top-right)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(0);
        doc.text("Reconnaissance", w - mr, 16, { align: "right" });
        doc.text("d'indications et de visite", w - mr, 24, { align: "right" });

        // ── 3. "Visiteur(s)"
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Visiteur(s)", w / 2 + 20, 40);

        // ── 4. LEFT COLUMN — Agency info
        let y = 48;
        const leftW = cw * 0.48;
        const rightX = ml + cw * 0.52;
        const rightW = cw * 0.48;

        this._label(doc, "Nom de l'agence", ml, y);
        y += 2;
        this._fieldBox(doc, ml, y, leftW, 7);
        this._value(doc, "Bogbe's Groupe Multi-Services", ml + 2, y + 5);
        y += 10;

        this._label(doc, "Accompagnateur", ml, y);
        y += 2;
        this._fieldBox(doc, ml, y, leftW, 7);
        this._value(doc, "Eden Oscar BOGBE", ml + 2, y + 5);
        y += 10;

        this._label(doc, "Adresse", ml, y);
        y += 2;
        this._fieldBox(doc, ml, y, leftW, 7);
        this._value(doc, "Cocody II Plateaux  8ème tranche  Abidjan", ml + 2, y + 5);
        y += 10;

        if (visitData.agentName) {
            this._label(doc, "Source / Publié par", ml, y);
            y += 2;
            this._fieldBox(doc, ml, y, leftW, 7, [248, 250, 252]);
            this._value(doc, `${visitData.agentName}${visitData.agentPhone ? ' (' + visitData.agentPhone + ')' : ''}`, ml + 2, y + 5);
            y += 10;
        }

        this._label(doc, "Mentions légales", ml, y);
        y += 2;
        this._fieldBox(doc, ml, y, leftW, 16);  // taller box: 2 lines with padding
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(40);
        doc.text("Bogbe's Groupe Multi-Services", ml + 2, y + 5);
        doc.text("N° Agrément: CI-ABJ-03-2022-A10-02301", ml + 2, y + 10);
        doc.text("Tél: 0778311541 / 0544872051 / 0708538709 / 0749992212", ml + 2, y + 15);
        y += 20; // move y past the mentions légales box

        // ── 5. RIGHT COLUMN — Visitor info
        let yr = 48;

        this._label(doc, "Nom, Prénom / Raison sociale", rightX, yr);
        yr += 2;
        this._fieldBox(doc, rightX, yr, rightW, 7, [245, 245, 245]);
        this._value(doc, visitData.content || "", rightX + 2, yr + 5);
        yr += 10;

        this._label(doc, "Adresse", rightX, yr);
        yr += 2;
        this._fieldBox(doc, rightX, yr, rightW, 7, [245, 245, 245]);
        yr += 10;

        this._label(doc, "Téléphone / e-mail", rightX, yr);
        yr += 2;
        this._fieldBox(doc, rightX, yr, rightW, 7, [245, 245, 245]);
        this._value(doc, visitData.phone || "", rightX + 2, yr + 5);
        yr += 10;

        this._label(doc, "Carte d'identité / Passeport", rightX, yr);
        yr += 2;
        this._fieldBox(doc, rightX, yr, rightW, 7, [245, 245, 245]);

        // ── 6. AVERTISSEMENT — positioned dynamically after both columns
        const disclaimerY = Math.max(y, yr + 10) + 4; // ensure it is below both columns
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(0);
        const disclaimerText =
            "À défaut de respect des engagements pris dans ce bon de visite, les visiteurs déclarent être informés, que ce bon de visite " +
            "pourra être utilisé comme preuve de l'origine de la présentation du bien ou des biens désigné(s) ci-dessous afin que le " +
            "professionnel de l'agence ci-contre mentionné, fasse valoir ses droits à commission.";
        const disclaimerLines = doc.splitTextToSize(disclaimerText, cw);
        doc.text(disclaimerLines, ml, disclaimerY);

        // ── 7. TABLEAU DES BIENS VISITÉS
        y = disclaimerY + disclaimerLines.length * 3.5 + 5;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text("Bien(s) visité(s) le", ml, y);

        this._fieldBox(doc, ml + 48, y - 4, 30, 6, [245, 245, 245]);
        this._value(doc, visitData.date || "", ml + 50, y + 0.5);

        y += 5;

        const colDesc = ml;
        const colAddr = ml + cw * 0.25;
        const colRef = ml + cw * 0.58;
        const colPrix = ml + cw * 0.78;
        const rowH = 8;

        doc.setFillColor(230, 230, 230);
        doc.setDrawColor(180);
        doc.setLineWidth(0.3);
        doc.rect(ml, y, cw, rowH, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(0);
        doc.text("Description", colDesc + 2, y + 5.5);
        doc.text("Adresse", colAddr + 2, y + 5.5);
        doc.text("Référence mandat", colRef + 2, y + 5.5);
        doc.text("Prix", colPrix + 2, y + 5.5);

        doc.line(colAddr, y, colAddr, y + rowH);
        doc.line(colRef, y, colRef, y + rowH);
        doc.line(colPrix, y, colPrix, y + rowH);

        y += rowH;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        for (let i = 0; i < 5; i++) {
            doc.setDrawColor(180);
            doc.setLineWidth(0.3);
            doc.rect(ml, y, cw, rowH);

            doc.line(colAddr, y, colAddr, y + rowH);
            doc.line(colRef, y, colRef, y + rowH);
            doc.line(colPrix, y, colPrix, y + rowH);

            doc.setTextColor(80);
            doc.text(`Bien n°${i + 1}`, colDesc + 2, y + 5.5);

            if (i === 0) {
                doc.setTextColor(0);
                // Detailed description: Type + Caracteristiques
                const descText = `${visitData.property}${visitData.caracteristiques ? ' - ' + visitData.caracteristiques : ''}`;
                const descList = doc.splitTextToSize(descText, (colAddr - colDesc) - 16);
                doc.text(descList[0] || "", colDesc + 14, y + 5.5);

                const addressText = doc.splitTextToSize(visitData.address || "", (colRef - colAddr) - 4);
                doc.text(addressText[0] || "", colAddr + 2, y + 5.5);

                doc.text(visitData.ref || "", colRef + 2, y + 5.5);
                doc.text(visitData.price || "", colPrix + 2, y + 5.5);
            }

            y += rowH;
        }

        // ── 8. DURÉE MANDAT
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(0);
        doc.text("À compter de ce jour et pour une durée de", ml, y);
        this._fieldBox(doc, ml + 58, y - 3.5, 12, 5, [245, 245, 245]);
        doc.text("mois (durée ne pouvant pas excéder le(s) mandat(s)) nous nous", ml + 72, y);
        y += 4;
        doc.text("engageons :", ml, y);

        // ── 9. ENGAGEMENTS
        y += 6;
        doc.setFontSize(7);
        const bullet1 =
            "• À nous interdire tout accord direct avec le(s) propriétaire(s) et ce, même par des personnes interposées ayant pour consé-" +
            "\n  quence d'évincer l'agence lors de l'achat ou la location du ou des bien(s) visité(s);";
        const bullet2 = "• À informer de la visite effectuée ce jour à toute personne éventuelle pouvant aller venir nous présenter le(s) mêmes biens;";
        const bullet3 = "• À ne divulguer aucun renseignement concernant ce(s) bien(s) à toute personne ne figurant pas sur ce bon de visite.";

        doc.text(doc.splitTextToSize(bullet1, cw), ml, y);
        y += 8;
        doc.text(doc.splitTextToSize(bullet2, cw), ml, y);
        y += 5;
        doc.text(doc.splitTextToSize(bullet3, cw), ml, y);

        // ── 10. NOTE ADDITIONNELLE
        y += 8;
        this._fieldBox(doc, ml, y, cw, 15, [245, 245, 245]);

        // ── 11. FAIT À / DATE / SIGNATURES
        y += 22;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        doc.text("Fait à :", ml, y);
        this._fieldBox(doc, ml + 14, y - 3.5, 40, 6, [245, 245, 245]);

        doc.text("Le :", ml + 62, y);
        this._fieldBox(doc, ml + 70, y - 3.5, 12, 6, [245, 245, 245]);
        doc.text("/", ml + 83, y);
        doc.setFont("helvetica", "bold");
        doc.text(String(year), ml + 88, y);

        y += 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Signature de l'accompagnateur", ml, y);
        doc.text("Signature du visiteur", w / 2 + 10, y);

        y += 3;
        this._fieldBox(doc, ml, y, cw * 0.45, 22, [245, 245, 245]);
        this._fieldBox(doc, w / 2 + 10, y, cw * 0.45, 22, [245, 245, 245]);



        return doc;
    }

    /** Generate and download the visit voucher as a PDF file. */
    generateVisitVoucher(visitData) {
        const doc = this._buildVisitVoucher(visitData);
        const safeName = (visitData.content || "Visiteur").replace(/\s+/g, "_");
        doc.save(`Bon_Visite_${safeName}.pdf`);
    }

    /** Generate the visit voucher and open it directly in a print dialog. */
    printVisitVoucher(visitData) {
        const doc = this._buildVisitVoucher(visitData);
        doc.autoPrint();
        const blobUrl = doc.output("bloburl");
        window.open(blobUrl, "_blank");
    }

    // ─── OFFRE D'ACHAT / LOCATION ─────────────────────────────────────────

    generateOffer(visitData) {
        const doc = new jsPDF();
        const w = doc.internal.pageSize.getWidth();
        const ml = 15;
        const mr = 15;
        const cw = w - ml - mr;

        // ── Logo ──
        if (this._logoBase64) {
            doc.addImage(this._logoBase64, "JPEG", ml, 8, 35, 35);
        }

        // ── Title ──
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(0);
        doc.text("OFFRE D'ACHAT / LOCATION", w / 2, 55, { align: "center" });

        // ── Content ──
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const startY = 80;

        doc.text(`Je soussigné(e), M./Mme ${visitData.content},`, ml, startY);
        doc.text("Agissant tant pour mon compte que pour celui de toute personne physique ou morale", ml, startY + 8);
        doc.text("se substituant à moi, déclare par la présente faire une offre pour le bien suivant :", ml, startY + 16);

        // Property Box
        doc.setDrawColor(200);
        doc.setFillColor(248, 250, 252);
        doc.rect(ml, startY + 25, cw, 30, "FD");

        doc.setFont("helvetica", "bold");
        doc.text(visitData.property || "", ml + 10, startY + 38);
        doc.setFont("helvetica", "normal");
        doc.text(`Proposé au prix de : ${visitData.price || ""}`, ml + 10, startY + 46);

        // Offer Details
        doc.text("Cette offre est faite au prix net vendeur de : ________________", ml, startY + 70);
        doc.text("Aux conditions suivantes :", ml, startY + 85);
        doc.text("- Durée de validité de l'offre : 7 jours", ml + 5, startY + 95);
        doc.text("- Sous réserve d'acceptation par le propriétaire", ml + 5, startY + 103);

        // Signatures
        const signY = startY + 140;
        doc.setFont("helvetica", "bold");
        doc.text("Fait à Abidjan, le " + new Date().toLocaleDateString("fr-FR"), ml, signY - 20);
        doc.text("L'Offrant (Signature précédée de 'Bon pour offre')", w - mr - 85, signY);

        // Save
        const safeName = (visitData.content || "Client").replace(/\s+/g, "_");
        doc.save(`Offre_${safeName}.pdf`);
    }
}

export const pdfService = new PdfService();
export default pdfService;
