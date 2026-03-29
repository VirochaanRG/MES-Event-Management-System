import { api, setToken as setClientToken } from './api';
import type { ApiUser } from './api';
import type { FormStatus } from '../types';

export type { ApiUser };
export { setClientToken as setToken };

// Auth

export async function login(email: string, password: string): Promise<{ user: ApiUser; token: string }> {
  const response = await api.post('/auth/login', { email: email.trim(), password });
  const { user, token } = response.data;
  setClientToken(token);
  return { user, token };
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch (err) {
  } finally {
    setClientToken(null);
  }
}

export async function register(email: string, password: string): Promise<{ user: ApiUser; token: string }> {
  const response = await api.post('/auth/register', { email: email.trim(), password });
  const { user, token } = response.data;
  setClientToken(token);
  return { user, token };
}

// Events

export async function getEvents() {
  const response = await api.get('/events');
  return response.data.data ?? response.data;
}

export async function getEvent(eventId: number) {
  const response = await api.get(`/events/${eventId}`);
  return response.data.data ?? response.data;
}

export async function registerForEvent(eventId: number, userEmail: string) {
  const response = await api.post(`/events/${eventId}/register`, {
    userEmail,
  });
  return response.data.data ?? response.data;
}

export async function generateEventQR(eventId: number, registrationId: number, userEmail?: string) {
  const response = await api.post(`/events/${eventId}/generateQR`, {
    registrationId,
  });
  return response.data.data ?? response.data;
}

export async function getEventRegistration(eventId: number, userEmail: string) {
  const response = await api.get(`/events/${eventId}/registration`, {
    params: { userEmail },
  });
  return response.data.data;
}

export async function getEventQRCodes(eventId: number, userEmail: string) {
  const response = await api.get(`/events/${eventId}/event-qrcodes`, {
    params: { userEmail },
  });
  return response.data.data ?? response.data;
}

// Registered Events

export async function getUserRegisteredEvents(userEmail: string) {
  const allEvents = await getEvents();
  if (!Array.isArray(allEvents) || allEvents.length === 0) return [];

  const registeredEvents = [];
  for (const ev of allEvents) {
    try {
      const response = await api.get(`/events/${ev.id}/registration`, {
        params: { userEmail },
      });
      const data = response.data;
      if (data.isRegistered) {
        registeredEvents.push(ev);
      }
    } catch {
    }
  }
  return registeredEvents;
}

// Forms / Surveys

function mapFormFromApi(form: any) {
  if (!form) return form;
  return {
    id: form.id,
    title: form.name || form.title,
    description: form.description,
    createdAt: form.createdAt || form.created_at,
    updatedAt: form.updatedAt || form.updated_at || form.createdAt || form.created_at,
  };
}

function mapQuestionFromApi(question: any) {
  if (!question) return question;
  let options = question.options;
  if (!options && question.optionsCategory) {
    try {
      const parsed = typeof question.optionsCategory === 'string'
        ? JSON.parse(question.optionsCategory)
        : question.optionsCategory;
      if (Array.isArray(parsed)) {
        options = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.choices)) {
          // multiple_choice / dropdown / multi_select: choices array
          options = parsed.choices;
        } else if (parsed.min != null && parsed.max != null) {
          // linear_scale: store as [min, max] strings for the scale renderer
          options = [String(parsed.min), String(parsed.max)];
        }
      }
    } catch {
      options = question.optionsCategory ? [question.optionsCategory] : null;
    }
  }
  return {
    id: question.id,
    formId: question.formId || question.form_id,
    question: question.questionTitle || question.question,
    type: question.questionType || question.type,
    options,
    required: question.required ?? true,
    order: question.qorder ?? question.order ?? 0,
    parentQuestionId: question.parentQuestionId || null,
    enablingAnswers: question.enablingAnswers || null,
  };
}

export async function getAvailableForms(userEmail: string) {
  const response = await api.get(`/forms/available/${encodeURIComponent(userEmail)}`);
  const forms = response.data.data ?? response.data;
  return Array.isArray(forms) ? forms.map(mapFormFromApi) : forms;
}

export async function getCompletedForms(userEmail: string) {
  const response = await api.get(`/forms/completed/${encodeURIComponent(userEmail)}`);
  const forms = response.data.data ?? response.data;
  return Array.isArray(forms) ? forms.map(mapFormFromApi) : forms;
}

export async function getForm(formId: number, userEmail?: string) {
  const params = userEmail ? { uid: userEmail } : {};
  const response = await api.get(`/forms/${formId}`, { params });
  const form = response.data.data ?? response.data;
  return mapFormFromApi(form);
}

export async function getFormStatus(formId: number, userEmail: string): Promise<FormStatus> {
  const response = await api.get(`/forms/${formId}/status/${encodeURIComponent(userEmail)}`);
  const raw = response.data.data ?? response.data;

  if (typeof raw === 'string') {
    return { status: raw as FormStatus['status'], submissionId: null };
  }
  if (raw && typeof raw === 'object' && raw.status) {
    return {
      status: raw.status as FormStatus['status'],
      submissionId: raw.submissionId ?? raw.submission_id ?? null,
    };
  }
  return { status: 'unfilled', submissionId: null };
}

export async function getFormQuestions(formId: number, userEmail?: string) {
  const params = userEmail ? { uid: userEmail } : {};
  const response = await api.get(`/forms/questions/${formId}`, { params });
  const questions = response.data.data ?? response.data;
  return Array.isArray(questions) ? questions.map(mapQuestionFromApi) : questions;
}

export async function getFormAnswers(formId: number, userEmail: string) {
  const response = await api.get(`/forms/${formId}/answers/${encodeURIComponent(userEmail)}`);
  return response.data.data ?? response.data;
}

export async function saveFormAnswer(formId: number, userEmail: string, questionId: number, answer: any, questionType: string = 'text') {
  const response = await api.post(`/forms/${formId}/answers/${encodeURIComponent(userEmail)}`, {
    qid: String(questionId),
    uid: userEmail,
    answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
    questionType,
  });
  return response.data.data ?? response.data;
}

export async function submitForm(formId: number, userEmail: string) {
  const response = await api.patch(`/forms/${formId}/submit/${encodeURIComponent(userEmail)}`);
  return response.data.data ?? response.data;
}

export async function deleteFormSubmission(formId: number, userEmail: string) {
  const response = await api.delete(`/forms/${formId}/delete/${encodeURIComponent(userEmail)}`);
  return response.data.data ?? response.data;
}

// Modular Forms

export interface ModularForm {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  isPublic: boolean;
}

export interface ModularFormPage {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  isPublic: boolean;
  status: 'available' | 'completed' | 'locked';
}

function mapModularFormFromApi(mf: any): ModularForm {
  return {
    id: mf.id,
    title: mf.name || mf.title,
    description: mf.description ?? null,
    createdAt: mf.createdAt || mf.created_at,
    isPublic: mf.isPublic ?? mf.is_public ?? false,
  };
}

export async function getAvailableModularForms(userEmail: string): Promise<ModularForm[]> {
  const response = await api.get(`/mod-forms/available/${encodeURIComponent(userEmail)}`);
  const forms = response.data.data ?? response.data;
  return Array.isArray(forms) ? forms.map(mapModularFormFromApi) : [];
}

export async function getCompletedModularForms(userEmail: string): Promise<ModularForm[]> {
  const response = await api.get(`/mod-forms/completed/${encodeURIComponent(userEmail)}`);
  const forms = response.data.data ?? response.data;
  return Array.isArray(forms) ? forms.map(mapModularFormFromApi) : [];
}

export async function getModularFormPages(modularFormId: number, userEmail: string): Promise<ModularFormPage[]> {
  const response = await api.get(`/mod-forms/${modularFormId}/all/${encodeURIComponent(userEmail)}`);
  const pages = response.data.data ?? response.data;
  return Array.isArray(pages)
    ? pages.map((p: any) => ({
        id: p.id,
        title: p.name || p.title,
        description: p.description ?? null,
        createdAt: p.createdAt || p.created_at,
        isPublic: p.isPublic ?? p.is_public ?? false,
        status: p.status ?? 'available',
      }))
    : [];
}

// Announcements

export interface Announcement {
  id: number;
  title: string;
  body: string;
  eventId: number | null;
  eventTitle: string | null;
  createdAt: string;
  read: boolean;
}

export async function getAnnouncements(userEmail: string): Promise<Announcement[]> {
  const response = await api.get('/user/announcements', { params: { email: userEmail } });
  return response.data.data ?? [];
}

export async function markAnnouncementsRead(userEmail: string, announcementIds: number[]): Promise<void> {
  await api.post('/user/announcements/read', { email: userEmail, announcementIds });
}

// Push tokens

export async function registerPushToken(userEmail: string, token: string): Promise<void> {
  await api.post('/user/push-token', { email: userEmail, token });
}

// Profile

export interface UserProfile {
  id?: number;
  userId?: number;
  firstName: string;
  lastName: string;
  isMcmasterStudent: boolean;
  faculty?: string | null;
  program?: string | null;
}

export async function getProfile(userId: number): Promise<UserProfile | null> {
  const response = await api.get(`/profiles/${userId}`);
  return response.data.data ?? null;
}

export async function saveProfile(data: UserProfile & { userId: number }): Promise<UserProfile> {
  const response = await api.post('/profiles', data);
  return response.data.data;
}
