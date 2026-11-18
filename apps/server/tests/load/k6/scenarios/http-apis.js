import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, COMMON_HEADERS } from '../config.js';
import { httpGet, httpPost } from '../lib/helpers.js';

/**
 * Suite of 10 Core HTTP / REST Endpoints
 */

// 1. Auth/Login
export function testLogin(email, password) {
  const url = `${BASE_URL}/api/v1/auth/login`;
  const payload = JSON.stringify({ email, password });
  return http.post(url, payload, { headers: COMMON_HEADERS });
}

// 2. Conversation list
export function testConversationList(token) {
  const url = `${BASE_URL}/api/v1/chat/conversations?limit=15`;
  return httpGet(url, { tag: 'chat_conversations', token });
}

// 3. Message history
export function testMessageHistory(token, conversationId = 'benchmark-conv-01') {
  const url = `${BASE_URL}/api/v1/chat/conversations/${conversationId}/messages?limit=25`;
  return httpGet(url, { tag: 'chat_messages', token });
}

// 4. Send message API
export function testSendMessage(token, conversationId = 'benchmark-conv-01') {
  const url = `${BASE_URL}/api/v1/chat/conversations/${conversationId}/messages`;
  const payload = JSON.stringify({
    content: `REST Load benchmark message #${Date.now()}`,
    clientMessageId: `rest-k6-${__VU}-${__ITER}-${Date.now()}`,
  });
  return httpPost(url, payload, { tag: 'chat_send_rest', token });
}

// 5. Read/seen API
export function testMarkConversationRead(token, conversationId = 'benchmark-conv-01') {
  const url = `${BASE_URL}/api/v1/chat/conversations/${conversationId}/read`;
  const headers = { ...COMMON_HEADERS };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return http.patch(url, null, { headers, tags: { tag: 'chat_mark_read' } });
}

// 6. Notification list
export function testNotificationList(token) {
  const url = `${BASE_URL}/api/v1/notifications?limit=20`;
  return httpGet(url, { tag: 'notifications_list', token });
}

// 7. Mark notification read
export function testMarkNotificationRead(token, notificationId = 'benchmark-notif-01') {
  const url = `${BASE_URL}/api/v1/notifications/${notificationId}/read`;
  const headers = { ...COMMON_HEADERS };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return http.patch(url, null, { headers, tags: { tag: 'notification_mark_read' } });
}

// 8. Pagination (Ad listings page 2 / page 3)
export function testAdPagination(page = 2) {
  const url = `${BASE_URL}/api/v1/ads?page=${page}&limit=20&sortBy=createdAt&sortOrder=desc`;
  return httpGet(url, { tag: 'ads_pagination' });
}

// 9. Search
export function testSearch(query = 'car') {
  const url = `${BASE_URL}/api/v1/ads/search?q=${encodeURIComponent(query)}&limit=15`;
  return httpGet(url, { tag: 'ads_search' });
}

// 10. Profile/user APIs
export function testUserProfile(token) {
  const url = `${BASE_URL}/api/v1/users/me`;
  return httpGet(url, { tag: 'user_profile', token });
}
