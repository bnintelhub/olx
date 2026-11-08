# OLX Chat & Push Notification Architecture

This document describes the real-time messaging architecture, read receipts, and action-required push notification decision engine.

---

## 1. System Architecture Overview

```mermaid
flowchart TD
    Sender["Client A (Sender)"]
    Server["Fastify Backend + Socket.IO"]
    Receiver["Client B (Recipient)"]
    FCM["Google Firebase Cloud Messaging (FCM)"]
    DB[("PostgreSQL + Redis")]

    Sender -->|"message.send (WebSocket)"| Server
    Server -->|"DB Persist + Deduplication"| DB
    Server -->|"isUserInsideConversation check"| DB

    alt Recipient is Inside Conversation
        Server -->|"message.new"| Receiver
        Server -->|"Direct Status: READ"| Sender
    else Recipient is Outside Conversation / Offline
        Server -->|"Evaluate Action Decision"| Server
        Server -->|"sendChatMessagePush"| FCM
        FCM -->|"WebPush / Background SW"| Receiver
    end
```

---

## 2. Real-Time Chat & Read Receipts Flow

```mermaid
sequenceDiagram
    autonumber
    actor UserA as Sender (User 7896)
    participant ClientA as Client A UI
    participant Server as Fastify Socket Server
    participant DB as PostgreSQL / Redis
    participant ClientB as Client B UI
    actor UserB as Recipient (User 9874)

    UserA->>ClientA: Types and clicks Send
    ClientA->>ClientA: Optimistic append (status: SENT)
    ClientA->>Server: emit('message.send', payload)
    Server->>DB: ChatService.sendMessage()
    Server->>Server: isUserInsideConversation(Recipient, ConvId)

    alt Recipient is Actively in Conversation Room
        Server->>DB: Update message status to READ
        Server-->>ClientA: ack({ status: 'READ' }) (Blue Checkmark)
        Server->>ClientB: emit('message.new', { ...msg, status: 'READ' })
        Server->>ClientA: emit('message.read', { convId, readerId })
    else Recipient is on Another Page / Background Tab
        Server-->>ClientA: ack({ status: 'SENT' }) (Single Checkmark)
        Server->>ClientB: emit('message.new', msg)
        ClientB->>ClientB: Play chime sound + Increment unread badge
        ClientB->>UserB: Desktop OS Notification / Toast popup
    else Recipient is Completely Offline / Browser Closed
        Server-->>ClientA: ack({ status: 'SENT' })
        Server->>Server: fcmDecisionService.evaluatePush()
        Server->>DB: Retrieve Recipient FCM Device Tokens
        Server->>Server: Dispatch FCM Multicast with tag: conv_${id}
    end
```

---

## 3. Action-Required Push Notification Decision Engine

```mermaid
flowchart TD
    Start["New Chat Message Arrives"] --> SelfCheck{"Is Sender == Recipient?"}
    SelfCheck -- "Yes" --> SuppressSelf["Suppress (No Self Notification)"]
    SelfCheck -- "No" --> ActiveCheck{"Is Recipient in THIS Conversation?"}

    ActiveCheck -- "Yes" --> SuppressActive["Suppress Push & Toast (User Already in Chat)"]
    ActiveCheck -- "No" --> DedupCheck{"Has Message ID Already Notified?"}

    DedupCheck -- "Yes" --> SuppressDedup["Suppress Duplicate"]
    DedupCheck -- "No" --> BlockCheck{"Is User/Conversation Blocked?"}

    BlockCheck -- "Yes" --> SuppressBlock["Suppress (Blocked or Inactive)"]
    BlockCheck -- "No" --> BurstCheck{"Messages arriving < 10s?"}

    BurstCheck -- "Yes" --> Bundle["Bundle Notification: 'N new messages'"]
    BurstCheck -- "No" --> Single["Single Notification: Latest message"]

    Bundle --> PriorityCheck{"Contains Transaction Keywords or First Inquiry?"}
    Single --> PriorityCheck

    PriorityCheck -- "Yes" --> HighPriority["High Priority (requireInteraction: true)"]
    PriorityCheck -- "No" --> NormalPriority["Normal Priority"]

    HighPriority --> Dispatch["Send FCM Multicast / Native Notification"]
    NormalPriority --> Dispatch
```

---

## 4. Message Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> OPTIMISTIC: User clicks Send
    OPTIMISTIC --> SENT: Server acknowledges message.send
    SENT --> DELIVERED: Recipient socket is online
    SENT --> READ: Recipient actively viewing chat
    DELIVERED --> READ: Recipient opens conversation
    READ --> [*]
```

- **SENT (`✓`)**: Stored in DB, dispatched from sender.
- **DELIVERED (`✓✓` Gray)**: Recipient socket is online and received payload.
- **READ (`✓✓` Cyan/Blue `#53bdeb`)**: Recipient has opened/viewed the thread.

---

## 5. Security & Credential Management

1. **Zero Hardcoded Secrets**:
   - All client Firebase configuration is loaded dynamically via environment variables (`import.meta.env.VITE_FIREBASE_*`).
   - Service workers (`sw.js`, `firebase-messaging-sw.js`) receive configuration via URL parameters or dynamic backend endpoint (`/api/v1/notifications/firebase-client-config`).
2. **Service Account Isolation**:
   - `*-firebase-adminsdk-*.json` is protected in `.gitignore`.
   - Never committed to git history.
3. **Environment Setup**:

### Client (`apps/client/.env`)
```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_public_vapid_key
```

### Server (`apps/server/.env`)
```env
FIREBASE_SERVICE_ACCOUNT_PATH=gen-lang-client-0067863163-firebase-adminsdk-fbsvc-3a9115427b.json
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```
