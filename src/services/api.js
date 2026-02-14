// API Service - Facade for Google Sheets Backend
import googleSheetsApi from './googleSheetsApi';

class ApiService {
    constructor() {
        this.sheetsApi = googleSheetsApi;
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
    formatPrice(amount) {
        return this.sheetsApi.formatPrice(amount);
    }
}

export const apiService = new ApiService();
export default apiService;
