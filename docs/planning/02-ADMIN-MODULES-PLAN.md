# Admin Modules Plan

## 1. Dashboard

### Purpose

Platform health और daily operations का quick overview।

### Data

- Total ads
- Active, pending, rejected और sold ads
- Users, categories, reports और conversations
- Category breakdown
- Recent ads
- Trend data

### Actions

- Post listing
- Open moderation
- Open all ads
- Open categories

### Acceptance

- Stats API error पर retry दिखे।
- Cards loading skeleton दिखाएं।
- Counts और charts real API response से render हों।

## 2. Listings / Manage All Ads

### Purpose

सभी listings को search, filter और manage करना।

### Filters

- Keyword
- Status
- Category
- Date range (future API support होने पर)

### Actions

- View details
- Change status
- Delete with confirmation
- Open moderation review

### Acceptance

- Filter बदलने पर सही API query जाए।
- Mutation के बाद table refresh या row update हो।
- Delete और status update पर confirmation/toast हो।

## 3. Moderation / Safety & Fraud Desk

### Purpose

Pending ads और user reports को review करना।

### Workflow

1. Pending ad/report queue load करें।
2. Listing, seller और report reason inspect करें।
3. Approve, reject, resolve या dismiss action लें।
4. Action reason capture करें जहां applicable हो।
5. Queue और dashboard counts refresh करें।

### Acceptance

- Unauthorized user moderation actions नहीं कर सके।
- Rejected listing public feed से hide हो।
- Report status visible और auditable हो।

## 4. Categories & Specs

### Purpose

Dynamic category tree और form attributes manage करना।

### Features

- Parent/child category create, edit और delete
- Category description और active state
- Attribute type, key, options, unit
- Required और filterable flags
- Display order

### Acceptance

- Category tree में hierarchy स्पष्ट हो।
- Attribute change के बाद post-ad form नया schema दिखाए।
- Delete actions confirmation के बिना execute न हों।

## 5. Users Management

### Purpose

Users, roles और account status का operational management।

### Planned actions

- Search user
- View profile and activity
- Suspend/activate
- Ban/unban
- Role visibility/update, permission के अनुसार

### Backend dependency

User list और status mutation endpoints को implement/verify करना होगा; केवल frontend tab पर्याप्त नहीं है।

## 6. Reports & Analytics

### Purpose

Operational trends और moderation metrics।

### Initial scope

- Ads by status
- Ads by category
- Reports by reason/status
- User and conversation totals
- Date trend

### Later scope

- Revenue/boost analytics
- Conversion funnel
- Saved search performance

## 7. Comments & Messages

### Purpose

Chat health और support visibility।

### Existing capability

Conversation history, unread counts और Socket.IO live messaging उपलब्ध हैं।

### Planned admin capability

- Search conversation
- Inspect participants and listing
- Safety escalation
- User/report context open करना

## 8. Settings

### Purpose

Operational preferences और future business configuration।

### Planned groups

- General marketplace settings
- Listing expiry
- Moderation defaults
- Notification templates
- Boost/monetization configuration

Secrets और JWT/SMS credentials settings UI में नहीं रखने हैं; वे environment/deployment configuration में रहेंगे।
