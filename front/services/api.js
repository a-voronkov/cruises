export class ApiService {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async getCruises(dateFrom, dateTo, shipId) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (shipId) params.append('ship_id', shipId);
    const res = await fetch(`${this.baseUrl}/api/cruises?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch cruises: ' + res.statusText);
    return await res.json();
  }

  async getCountries() {
    const response = await fetch(`${this.baseUrl}/countries.geo.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch countries: ${response.statusText}`);
    }
    return response.json();
  }

  async getPoints() {
    const response = await fetch(`${this.baseUrl}/api/points`);
    if (!response.ok) {
      throw new Error(`Failed to fetch points: ${response.statusText}`);
    }
    return response.json();
  }

  async getShips() {
    const response = await fetch(`${this.baseUrl}/api/ships`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ships: ${response.statusText}`);
    }
    return response.json();
  }
} 