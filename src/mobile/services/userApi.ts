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
      options = typeof question.optionsCategory === 'string'
        ? JSON.parse(question.optionsCategory)
        : question.optionsCategory;
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

export async function getAvailableForms(userId: number) {
  const response = await api.get(`/forms/available/${userId}`);
  const forms = response.data.data ?? response.data;
  return Array.isArray(forms) ? forms.map(mapFormFromApi) : forms;
}

export async function getCompletedForms(userId: number) {
  const response = await api.get(`/forms/completed/${userId}`);
  const forms = response.data.data ?? response.data;
  return Array.isArray(forms) ? forms.map(mapFormFromApi) : forms;
}

export async function getForm(formId: number) {
  const response = await api.get(`/forms/${formId}`);
  const form = response.data.data ?? response.data;
  return mapFormFromApi(form);
}

export async function getFormStatus(formId: number, userId: number): Promise<FormStatus> {
  const response = await api.get(`/forms/${formId}/status/${userId}`);
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

export async function getFormQuestions(formId: number) {
  const response = await api.get(`/forms/questions/${formId}`);
  const questions = response.data.data ?? response.data;
  return Array.isArray(questions) ? questions.map(mapQuestionFromApi) : questions;
}

export async function getFormAnswers(formId: number, userId: number) {
  const response = await api.get(`/forms/${formId}/answers/${userId}`);
  return response.data.data ?? response.data;
}

export async function saveFormAnswer(formId: number, userId: number, questionId: number, answer: any, questionType: string = 'text') {
  const response = await api.post(`/forms/${formId}/answers/${userId}`, {
    qid: String(questionId),
    uid: String(userId),
    answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
    questionType,
  });
  return response.data.data ?? response.data;
}

export async function submitForm(formId: number, userId: number) {
  const response = await api.patch(`/forms/${formId}/submit/${userId}`);
  return response.data.data ?? response.data;
}

export async function deleteFormSubmission(formId: number, userId: number) {
  const response = await api.delete(`/forms/${formId}/delete/${userId}`);
  return response.data.data ?? response.data;
}
