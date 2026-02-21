// API Service - Facade for Google Sheets Backend
import { supabaseService } from './supabaseService';

class ApiService {
    constructor() {
        // Switch to Supabase
        this.sheetsApi = supabaseService;
    }

    // Auth
    async login(email, password) {
        return this.sheetsApi.login(email, password);
    }

    validateToken(token) {
        return this.sheetsApi.validateToken(token);
    }

    getToken() {
        return this.sheetsApi.getToken();
    }

    // Data
    async getImages(forceRefresh = false) {
        return this.sheetsApi.getImages(forceRefresh);
    }

    async getRequests(forceRefresh = false) {
        return this.sheetsApi.getRequests(forceRefresh);
    }

    async getProperties(forceRefresh = false) {
        return this.sheetsApi.getProperties(forceRefresh);
    }

    async getVisits(forceRefresh = false) {
        return this.sheetsApi.getVisits(forceRefresh);
    }

    async getStats(forceRefresh = false) {
        return this.sheetsApi.getStats(forceRefresh);
    }

    async getImagesProperties(forceRefresh = false) {
        return this.sheetsApi.getImagesProperties(forceRefresh);
    }

    async getImagesForPublication(publicationId) {
        return this.sheetsApi.getImagesForPublication(publicationId);
    }

    // Clients - extraits des visites
    async getClients(forceRefresh = false) {
        return this.sheetsApi.getClients(forceRefresh);
    }

    // Pipeline
    async getPipeline(forceRefresh = false) {
        return this.sheetsApi.getPipeline(forceRefresh);
    }

    async updatePipelineStatus(id, newStatus) {
        return this.sheetsApi.updatePipelineStatus(id, newStatus);
    }

    // Real-time
    startPolling(interval = 30000) {
        this.sheetsApi.startPolling(interval);
    }

    stopPolling() {
        this.sheetsApi.stopPolling();
    }

    // Events
    subscribe(event, callback) {
        return this.sheetsApi.subscribe(event, callback);
    }

    // Status
    get isOnline() {
        return this.sheetsApi.isOnline;
    }

    // Utility
    formatPrice(amount, propertyType = null) {
        return this.sheetsApi.formatPrice(amount, propertyType);
    }
}

export const apiService = new ApiService();
export default apiService;
