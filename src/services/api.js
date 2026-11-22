import { http, authConfig } from './http.js';

export const registerUser = (payload) =>
  http.post('/auth/register', payload);

export const loginUser = (payload) =>
  http.post('/auth/login', payload);

export const fetchMe = (token) =>
  http.get('/auth/me', authConfig(token));

export const logoutUser = (token) =>
  http.post('/auth/logout', {}, authConfig(token));

export const fetchApiInfo = () =>
  http.get('/info');

export const fetchSources = (activeOnly = false) =>
  http.get('/sources', { params: activeOnly ? { active: 'true' } : undefined });

export const runMarketSearch = ({ term, source = 'todos_supermercados', limit = 150, token }) =>
  http.post('/search', { term, source, limit }, authConfig(token));

export const fetchSearchHistory = (token, filters = {}) =>
  http.get('/search-history', { ...authConfig(token), params: filters });

export const fetchStudiesSummary = (token) =>
  http.get('/search-history/resumen', authConfig(token));

export const fetchStudyById = (id, token) =>
  http.get(`/search-history/${encodeURIComponent(id)}`, authConfig(token));

export const updateStudyById = (id, payload, token) =>
  http.put(`/search-history/${encodeURIComponent(id)}`, payload, authConfig(token));

export const deleteStudyById = (id, token) =>
  http.delete(`/search-history/${encodeURIComponent(id)}`, authConfig(token));

export const clearSearchHistory = (token) =>
  http.delete('/search-history', authConfig(token));

export const fetchAssistantHistory = (studyId, token) =>
  http.get(`/assistant/chat/${encodeURIComponent(studyId)}`, authConfig(token));

export const sendAssistantMessage = ({ studyId, messages, filteredProductIds, token }) =>
  http.post('/assistant/chat', { studyId, messages, filteredProductIds }, authConfig(token));

export const fetchSearchVariations = ({ term, medianPrice, token }) =>
  http.post('/search/variations', { term, medianPrice }, authConfig(token));
