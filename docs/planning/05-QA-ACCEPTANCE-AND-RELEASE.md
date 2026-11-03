# QA, Acceptance और Release Checklist

## Critical customer flows

- [ ] Guest home और recommendations load करता है।
- [ ] Search keyword/category/city filters सही results देते हैं।
- [ ] OTP send और verify flow चलता है।
- [ ] Authenticated user image के साथ ad create करता है।
- [ ] My Ads में listing दिखाई देती है।
- [ ] Favourite toggle और wishlist persist होते हैं।
- [ ] Buyer conversation start करके message भेजता है।
- [ ] Typing और read status update होते हैं।
- [ ] User listing report और block कर सकता है।

## Critical admin flows

- [ ] `/admin` login और session restore।
- [ ] Dashboard stats load, empty और error state।
- [ ] Admin listing filter/search करता है।
- [ ] Admin status update और delete confirmation।
- [ ] Moderator pending ad review करता है।
- [ ] Report resolve/dismiss होता है।
- [ ] Category और dynamic attribute create/update।
- [ ] New attribute post-ad form में दिखाई देता है।
- [ ] Unauthorized role protected action नहीं कर सकता।

## Responsive/accessibility

- [ ] Desktop fixed sidebar।
- [ ] Collapsible sidebar और mobile drawer।
- [ ] Keyboard tab order।
- [ ] Visible focus state।
- [ ] Form labels और inline errors।
- [ ] Table horizontal scroll/card fallback।
- [ ] Color contrast और status text/icon।

## Technical validation

```powershell
npm run build
npm run test:e2e
```

Additional checks:

- [ ] Backend `/api/v1/health` returns healthy।
- [ ] Prisma schema generates successfully।
- [ ] Docker Compose services start healthy।
- [ ] No secrets committed।
- [ ] Production `.env` values use strong unique secrets।
- [ ] Upload size/type limits verified।
- [ ] CORS only allows intended origins।
- [ ] Errors do not expose stack traces or credentials।

## Release evidence

हर release के साथ record करें:

- Commit/build identifier
- Database schema change
- Environment variables changed
- Test commands और result
- Known limitations
- Rollback steps
- Migration backup/restore confirmation
