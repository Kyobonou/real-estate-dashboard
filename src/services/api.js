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

    async getProperties(forceRefresh = false, filters = null) {
        return this.sheetsApi.getProperties(forceRefresh, filters);
    }

    async getTotalCount(filters = null) {
        return this.sheetsApi.getTotalCount(filters);
    }

    async getVisits(forceRefresh = false) {
        return this.sheetsApi.getVisits(forceRefresh);
    }

    async createVisit(visitData) {
        return this.sheetsApi.createVisit(visitData);
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

    async getImagesForPublications(publicationIds) {
        return this.sheetsApi.getImagesForPublications(publicationIds);
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

    async refreshData() {
        return this.sheetsApi.refreshData();
    }

    // Events
    subscribe(event, callback) {
        return this.sheetsApi.subscribe(event, callback);
    }

    // Status
    get isOnline() {
        return this.sheetsApi.isOnline;
    }

    // Property lifecycle
    async getExpiringProperties(daysThreshold = 30) {
        return this.sheetsApi.getExpiringProperties(daysThreshold);
    }

    async renewProperty(propertyId, days = 30) {
        return this.sheetsApi.renewProperty(propertyId, days);
    }

    async archiveProperty(propertyId) {
        return this.sheetsApi.archiveProperty(propertyId);
    }

    async toggleDisponible(propertyId, currentDisponible) {
        return this.sheetsApi.toggleDisponible(propertyId, currentDisponible);
    }

    // Utility
    formatPrice(amount) {
        return this.sheetsApi.formatPrice(amount);
    }
}

export const apiService = new ApiService();
export default apiService;
