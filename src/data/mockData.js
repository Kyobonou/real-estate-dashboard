export const properties = [
    {
        id: 1,
        type: "Maison",
        offer: "Location",
        zone: "Cocody Mermoz",
        price: "150,000 FCFA", // Formatted price
        status: "Disponible",
        features: ["3 Chambres", "Jardin", "Garage"],
        publisher: "Kassio Wilfried YOBONOU",
        phone: "22507070707",
        image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        description: "Belle villa avec grand jardin, située dans un quartier calme."
    },
    {
        id: 2,
        type: "Studio",
        offer: "Location",
        zone: "Yopougon Maroc",
        price: "60,000 FCFA",
        status: "Occupé",
        features: ["Meublé", "Wifi", "Climatisé"],
        publisher: "Agence Immo Pro",
        phone: "22505050505",
        image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        description: "Studio moderne tout équipé, idéal pour étudiant ou jeune cadre."
    },
    {
        id: 3,
        type: "Appartement",
        offer: "Vente",
        zone: "Marcory Zone 4",
        price: "85,000,000 FCFA",
        status: "Disponible",
        features: ["4 Pièces", "Piscine", "Sécurité 24/7"],
        publisher: "Prestige Immo",
        phone: "22501010101",
        image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        description: "Appartement haut standing avec vue imprenable sur la lagune."
    },
];

export const visits = [
    {
        id: 1,
        clientName: "Jean Kouassi",
        clientPhone: "22507123456",
        propertyId: 1,
        propertyName: "Maison - Cocody Mermoz",
        date: "2023-10-25 14:00",
        status: "Programmée",
    },
    {
        id: 2,
        clientName: "Marie Koné",
        clientPhone: "22505987654",
        propertyId: 3,
        propertyName: "Appartement - Marcory Zone 4",
        date: "2023-10-26 10:00",
        status: "Terminée",
    },
    {
        id: 3,
        clientName: "Ahmed Diallo",
        clientPhone: "22501234567",
        propertyId: 2,
        propertyName: "Studio - Yopougon Maroc",
        date: "2023-10-27 16:30",
        status: "En attente",
    }
];

export const stats = {
    activeProperties: 12,
    visitsToday: 3,
    pendingLeads: 5,
    revenueMonth: "1.2M FCFA"
};
