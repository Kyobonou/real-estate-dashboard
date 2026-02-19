
import { jsPDF } from "jspdf";

class PdfService {
    constructor() {
        //
    }

    generateVisitVoucher(visitData) {
        const doc = new jsPDF();
        const width = doc.internal.pageSize.getWidth();

        // --- Header ---
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229); // Primary color
        doc.text("IMMODASH", 20, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Agence Immobilière Premium", 20, 26);
        doc.text("Abidjan, Côte d'Ivoire | +225 07 00 00 00 00", 20, 31);

        // Line separator
        doc.setLineWidth(0.5);
        doc.setDrawColor(200);
        doc.line(20, 36, width - 20, 36);

        // --- Title ---
        doc.setFontSize(18);
        doc.setTextColor(0);
        doc.text("BON DE VISITE", width / 2, 55, { align: "center" });

        // --- Client Info ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");

        const startY = 80;
        doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 20, startY);

        doc.setFont("helvetica", "bold");
        doc.text("CLIENT VISITEUR :", 20, startY + 15);
        doc.setFont("helvetica", "normal");
        doc.text(`Nom : ${visitData.content}`, 30, startY + 22);
        // doc.text(`Téléphone : ${visitData.phone || 'Non renseigné'}`, 30, startY + 29);

        // --- Property Info ---
        doc.setFont("helvetica", "bold");
        doc.text("BIEN VISITÉ :", 20, startY + 45);
        doc.setFont("helvetica", "normal");
        doc.text(`Type : ${visitData.property}`, 30, startY + 52);
        doc.text(`Budget / Prix : ${visitData.price}`, 30, startY + 59);
        doc.text(`Date prévue : ${visitData.date}`, 30, startY + 66);

        // --- Legal Text ---
        doc.setFontSize(10);
        doc.setTextColor(100);
        const legalText = "Le client reconnaît avoir visité ce jour le bien désigné ci-dessus par l'intermédiaire de l'agence IMMODASH. Il s'engage à ne pas traiter directement avec le propriétaire sans l'intervention de l'agence, sous peine de devoir payer les honoraires d'agence.";
        const splitText = doc.splitTextToSize(legalText, width - 40);
        doc.text(splitText, 20, startY + 90);

        // --- Signatures ---
        const signY = startY + 130;
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text("L'Agent Immobilier", 40, signY);
        doc.text("Le Client", width - 60, signY);

        // Dotted lines for signatures
        doc.setLineWidth(0.1);
        doc.setDrawColor(0);
        doc.line(30, signY + 30, 90, signY + 30);
        doc.line(width - 90, signY + 30, width - 30, signY + 30);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Document généré automatiquement par ImmoDash Premium", width / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });

        // Save
        doc.save(`Bon_Visite_${visitData.content.replace(/\s+/g, '_')}.pdf`);
    }

    generateOffer(visitData) {
        const doc = new jsPDF();
        const width = doc.internal.pageSize.getWidth();

        // --- Header ---
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text("IMMODASH", 20, 20);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Agence Immobilière Premium", 20, 26);
        doc.line(20, 36, width - 20, 36);

        // --- Title ---
        doc.setFontSize(18);
        doc.setTextColor(0);
        doc.text("OFFRE D'ACHAT / LOCATION", width / 2, 55, { align: "center" });

        // --- Content ---
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const startY = 80;

        doc.text(`Je soussigné(e), M./Mme ${visitData.content},`, 20, startY);
        doc.text(`Agissant tant pour mon compte que pour celui de toute personne physique ou morale`, 20, startY + 8);
        doc.text(`se substituant à moi, déclare par la présente faire une offre pour le bien suivant :`, 20, startY + 16);

        // Property Box
        doc.setDrawColor(200);
        doc.setFillColor(248, 250, 252);
        doc.rect(20, startY + 25, width - 40, 30, "FD");

        doc.setFont("helvetica", "bold");
        doc.text(visitData.property, 30, startY + 38);
        doc.setFont("helvetica", "normal");
        doc.text(`Proposé au prix de : ${visitData.price}`, 30, startY + 46);

        // Offer Details
        doc.text(`Cette offre est faite au prix net vendeur de : ________________`, 20, startY + 70);
        doc.text(`Aux conditions suivantes :`, 20, startY + 85);
        doc.text(`- Durée de validité de l'offre : 7 jours`, 25, startY + 95);
        doc.text(`- Sous réserve d'acceptation par le propriétaire`, 25, startY + 103);

        // Signatures
        const signY = startY + 140;
        doc.setFont("helvetica", "bold");
        doc.text("Fait à Abidjan, le " + new Date().toLocaleDateString('fr-FR'), 20, signY - 20);

        doc.text("L'Offrant (Signature précédée de 'Bon pour offre')", width - 100, signY);

        // Save
        doc.save(`Offre_${visitData.content.replace(/\s+/g, '_')}.pdf`);
    }
}

export const pdfService = new PdfService();
export default pdfService;
