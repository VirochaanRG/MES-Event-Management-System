import { api, adminApiClient } from './api';

// Events
export async function getEvents() {
  const response = await api.get('/events');
  return response.data.data ?? response.data;
}


export async function createEvent(eventData: {
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  capacity?: number;
  isPublic?: boolean;
  status?: string;
  cost?: number;
}) {
  const response = await api.post('/events', eventData);
  return response.data.data ?? response.data;
}

export async function deleteEvent(eventId: number): Promise<boolean> {
  await api.delete(`/events/${eventId}`);
  return true;
}

// Registration List

export async function getEventRegistrationList(eventId: number) {
  const response = await adminApiClient.get(`/events/${eventId}/registrationlist`);
  return response.data.data ?? response.data;
}

// QR Check-In

export async function qrCheckIn(eventId: number, registrationHash: string) {
  const response = await adminApiClient.patch(`/events/${eventId}/qr-check-in`, { registrationHash });
  return response.data.data ?? response.data;
}

// Users

export async function getUsers() {
  const response = await adminApiClient.get('/users');
  return response.data.data ?? response.data;
}

export async function updateUserRoles(userId: number, roles: string[]): Promise<boolean> {
  await adminApiClient.put(`/users/${userId}/roles`, { roles });
  return true;
}

export async function deleteUser(userId: number): Promise<boolean> {
  await adminApiClient.delete(`/users/${userId}`);
  return true;
}

// Form Analytics

export async function getFormAnalytics() {
  const response = await adminApiClient.get('/forms/analytics');
  return response.data.data ?? response.data;
}

export async function getFormCompletions(formId: number) {
  const response = await adminApiClient.get(`/forms/${formId}/completions`);
  return response.data.data ?? response.data;
}
