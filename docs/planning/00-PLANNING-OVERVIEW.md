# OLX ORBIT Implementation Planning

यह folder OLX ORBIT के admin और marketplace development का practical execution plan है। इसका उद्देश्य यह स्पष्ट करना है कि क्या बनाना है, किस क्रम में बनाना है, कौन-से existing modules reuse करने हैं और feature complete होने पर कैसे verify करना है।

## Planning principles

1. Existing API और Prisma schema को पहले समझकर काम करें; duplicate business logic न बनाएं।
2. हर admin page shared shell, table, form, modal, toast और error state reuse करे।
3. UI पहले mock data से नहीं, उपलब्ध API contract से wire हो।
4. Loading, empty, error, success और permission-denied states हर module में अनिवार्य हैं।
5. Backend authorization को केवल UI visibility पर निर्भर न रखें।
6. हर phase के अंत में type-check, build और targeted flow test चलाएं।

## Current baseline

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Backend: Express + TypeScript + Prisma
- Database: MySQL 8.4
- Auth: JWT access/refresh tokens और phone OTP
- Real-time: Socket.IO
- Admin entry: `/admin`
- API prefix: `/api/v1`
- Deployment: Docker Compose और Nginx

## Delivery order

| Phase | Focus | Depends on |
|---|---|---|
| 0 | Audit और baseline | None |
| 1 | Shared admin shell और design system | Phase 0 |
| 2 | Authentication और RBAC | Phase 1 |
| 3 | Dashboard और analytics | Phase 2 |
| 4 | Listings और moderation | Phase 2 |
| 5 | Users और safety | Phase 2 |
| 6 | Categories और locations | Phase 2 |
| 7 | Chat, reports और support | Phase 4, 5 |
| 8 | Settings और monetization | Phase 3, 4, 6 |
| 9 | QA, security और release | All previous phases |

## Definition of done

- TypeScript errors नहीं हैं।
- API errors user-friendly message/toast में दिखते हैं।
- Permission checks backend और frontend दोनों जगह हैं।
- Desktop, tablet और mobile fallback verify है।
- Keyboard focus, labels और contrast usable हैं।
- Empty, loading और retry states उपलब्ध हैं।
- Relevant API और UI flow manually या automated test से verify है।
- README और related docs implementation के साथ updated हैं।

## Phase 0 audit deliverables

- [Phase 0 audit report](06-PHASE-0-AUDIT-REPORT.md)
- [API integration matrix](07-API-INTEGRATION-MATRIX.md)
- [Defect and risk register](08-DEFECT-AND-RISK-REGISTER.md)
- [Rebuild scope approval](09-REBUILD-SCOPE-APPROVAL.md)
- [Phase 2 auth/RBAC implementation](10-PHASE-2-AUTH-RBAC-IMPLEMENTATION.md)
