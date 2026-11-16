# BLX Orbit — Flutter Client API Integration Guide

> **Developer Notice**: This document provides the complete API specification and step-by-step instructions for integrating the backend with your Flutter application. All endpoints, payloads, query parameters, authentication flows, and real-time Socket.IO events are documented below with ready-to-use Flutter / Dart examples.

---

## 1. Network & Server Architecture

### 1.1 Base URLs
| Service | Environment | URL |
| :--- | :--- | :--- |
| **REST API Base URL** | Development | `http://10.0.2.2:5000/api/v1` *(Android Emulator)*<br>`http://localhost:5000/api/v1` *(iOS Simulator / Web)*<br>`http://<YOUR_LAN_IP>:5000/api/v1` *(Physical Device)* |
| **Media / Images CDN** | Development | `http://10.0.2.2:5000/uploads/` *(or `/media/`)* |
| **WebSocket / Socket.IO** | Development | `http://10.0.2.2:5000` *(Path: `/socket.io`)* |

> **Android Emulator Tip**: Android emulators route `10.0.2.2` to the host machine's `localhost`. If testing on a physical device, connect your mobile to the same Wi-Fi and use your machine's local IP (e.g. `http://192.168.1.5:5000`).

---

### 1.2 Global Headers
All HTTP requests sent from Flutter should include the following headers:
```http
Content-Type: application/json
Accept: application/json
X-App-Context: mobile
Authorization: Bearer <ACCESS_TOKEN>  # (Required on protected routes)
```

---

### 1.3 Standard API Response Structure

#### Success Response (200 / 201)
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

#### Error Response (400 / 401 / 403 / 404 / 409 / 500)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid mobile number or OTP"
  }
}
```

---

## 2. Authentication & Session Management

The system supports two client authentication modes:
1. **Mobile Number + SMS OTP** *(Primary / Recommended for India)*
2. **Email + Password** *(Standard registration with email verification)*

Tokens issued:
- `accessToken`: Short-lived JWT (24 hours). Sent in the `Authorization: Bearer <token>` header.
- `refreshToken`: Long-lived token (30 days). Used to renew expired access tokens.

---

### 2.1 Send Mobile OTP
Sends a 6-digit OTP to the user's phone via SMS. In development/testing, mock OTP is `123456`.

- **Endpoint:** `POST /api/v1/auth/otp/send`
- **Auth:** Public
- **Request Body:**
```json
{
  "phoneNumber": "9876543210"
}
```
*(Accepts 10 digits or with `+91`)*

- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "phoneNumber": "+919876543210",
    "cooldownSeconds": 60,
    "expiresInSeconds": 300
  },
  "message": "OTP sent successfully"
}
```

---

### 2.2 Verify Mobile OTP & Sign In / Register
Verifies the OTP code. If the user doesn't exist, a new user account is automatically created.

- **Endpoint:** `POST /api/v1/auth/otp/verify`
- **Auth:** Public
- **Request Body:**
```json
{
  "phoneNumber": "9876543210",
  "otp": "123456"
}
```

- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1...",
      "refreshToken": "e2a1b9c8d7..."
    },
    "user": {
      "id": "usr-1234-uuid",
      "phoneNumber": "+919876543210",
      "email": null,
      "role": "USER",
      "isNewUser": false,
      "profile": {
        "name": "Rahul Verma",
        "avatarUrl": "https://...",
        "city": "Mumbai"
      }
    }
  },
  "message": "OTP verified successfully"
}
```

---

### 2.3 Email & Password Register
- **Endpoint:** `POST /api/v1/auth/register`
- **Auth:** Public
- **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "Rahul Verma",
  "phoneNumber": "9876543210"
}
```

---

### 2.4 Email & Password Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Auth:** Public
- **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

---

### 2.5 Silent Token Refresh (Auto-Refresh on 401)
When your HTTP client encounters a `401 Unauthorized` error, call this endpoint with the saved `refreshToken` to get a fresh `accessToken`.

- **Endpoint:** `POST /api/v1/auth/refresh`
- **Auth:** Public
- **Request Body:**
```json
{
  "refreshToken": "e2a1b9c8d7..."
}
```

- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "new-refresh-token..."
  }
}
```

---

### 2.6 Get Current User Profile (`/auth/me`)
Call on Flutter app startup to validate the stored token and retrieve current user state.

- **Endpoint:** `GET /api/v1/auth/me`
- **Auth:** Required (`Bearer <token>`)
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr-1234-uuid",
      "phoneNumber": "+919876543210",
      "email": "user@example.com",
      "role": "USER",
      "profile": {
        "name": "Rahul Verma",
        "avatarUrl": "...",
        "location": {
          "id": "loc-mumbai-1",
          "name": "Mumbai",
          "state": "Maharashtra"
        }
      }
    }
  }
}
```

---

### 2.7 Logout
Invalidates the refresh token on the server and unlinks sessions.

- **Endpoint:** `POST /api/v1/auth/logout`
- **Auth:** Required (`Bearer <token>`)
- **Request Body:**
```json
{
  "refreshToken": "e2a1b9c8d7..."
}
```

---

## 3. Categories & Taxonomy

### 3.1 Get Category Tree (Home Categories & Subcategories)
Retrieves all categories formatted as a hierarchical parent-child tree with icons and slugs.

- **Endpoint:** `GET /api/v1/categories/tree`
- **Auth:** Public
- **Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cat-cars-1",
      "name": "Cars & Vehicles",
      "slug": "cars",
      "icon": "car",
      "imageUrl": "http://.../uploads/categories/cars.webp",
      "children": [
        {
          "id": "sub-cars-used",
          "name": "Cars",
          "slug": "used-cars",
          "parentId": "cat-cars-1"
        },
        {
          "id": "sub-bikes",
          "name": "Motorcycles",
          "slug": "motorcycles",
          "parentId": "cat-cars-1"
        }
      ]
    },
    {
      "id": "cat-mobile-2",
      "name": "Mobiles & Tablets",
      "slug": "mobiles",
      "icon": "smartphone",
      "imageUrl": "http://.../uploads/categories/mobiles.webp",
      "children": [...]
    }
  ]
}
```

---

### 3.2 Get Dynamic Category Attributes (Posting Custom Fields)
Returns the dynamic schema for posting an ad in a specific category (e.g. `Brand`, `Year`, `Fuel Type`, `KM Driven`). Use this to render dynamic forms in your Flutter sell screen.

- **Endpoint:** `GET /api/v1/categories/:id/attributes`
- **Auth:** Public
- **Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "attr-brand",
      "name": "brand",
      "label": "Brand",
      "type": "SELECT",
      "isRequired": true,
      "options": ["Maruti Suzuki", "Hyundai", "Tata", "Honda", "Mahindra"]
    },
    {
      "id": "attr-year",
      "name": "year",
      "label": "Year of Registration",
      "type": "NUMBER",
      "isRequired": true
    },
    {
      "id": "attr-fuel",
      "name": "fuel_type",
      "label": "Fuel Type",
      "type": "SELECT",
      "isRequired": true,
      "options": ["Petrol", "Diesel", "CNG", "Electric"]
    }
  ]
}
```

---

## 4. Locations & Geolocation

### 4.1 Search Locations by Query
Autocomplete for location selector dialog (City, Area, Pincode).

- **Endpoint:** `GET /api/v1/locations/search?q=mumbai`
- **Auth:** Public
- **Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "loc-mum-andheri",
      "name": "Andheri West",
      "slug": "andheri-west",
      "type": "LOCALITY",
      "city": "Mumbai",
      "state": "Maharashtra"
    },
    {
      "id": "loc-mum-bandra",
      "name": "Bandra West",
      "slug": "bandra-west",
      "type": "LOCALITY",
      "city": "Mumbai",
      "state": "Maharashtra"
    }
  ]
}
```

---

### 4.2 Get Popular / Top Cities
For the initial quick-select city chips on Flutter home.

- **Endpoint:** `GET /api/v1/locations/cities`
- **Auth:** Public

---

### 4.3 Search Nearby by GPS Coordinates
Finds nearest locality using device's `Geolocator` coordinates.

- **Endpoint:** `GET /api/v1/locations/nearby?lat=19.0760&lng=72.8777&radius=25`
- **Auth:** Public

---

## 5. Homepage Banners

### 5.1 Get Active Promotional Banners
Returns dynamic banner slides configured by CMS.

- **Endpoint:** `GET /api/v1/banners`
- **Auth:** Public
- **Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "bnr-festival-1",
      "title": "Festival Mega Clearance",
      "description": "Flat 40% OFF on certified pre-owned electronics",
      "imageUrl": "http://.../uploads/banners/watch.webp",
      "ctaText": "Explore Now",
      "ctaLink": "/ads?categoryId=cat-electronics",
      "tag": "Featured Promotion",
      "location": "All India"
    }
  ]
}
```

---

## 6. Listings & Classified Ads

### 6.1 Browse & Search Listings (`GET /api/v1/ads`)
The main search and discovery endpoint. Supports infinite scroll pagination and multi-facet filtering.

- **Endpoint:** `GET /api/v1/ads`
- **Auth:** Public (optional token for personalized favorite flags)
- **Query Parameters:**
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `20`)
  - `search` or `q`: Text query (e.g. `iphone 15 pro`)
  - `categoryId`: Filter by category UUID
  - `locationId`: Filter by location UUID
  - `minPrice`: Minimum price in INR
  - `maxPrice`: Maximum price in INR
  - `sortBy`: `newest` | `price_asc` | `price_desc` | `popular`
  - `featured`: `true` | `false`

- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "ad-uuid-1234",
        "title": "Apple iPhone 15 Pro 128GB - Pristine Condition",
        "description": "Battery health 98%, bill box and charger available...",
        "price": 74999,
        "negotiable": true,
        "status": "ACTIVE",
        "isFeatured": true,
        "isFavourite": false,
        "createdAt": "2026-11-14T10:30:00.000Z",
        "category": {
          "id": "cat-mobiles",
          "name": "Mobile Phones",
          "slug": "mobiles"
        },
        "location": {
          "id": "loc-1",
          "name": "Andheri West",
          "city": "Mumbai"
        },
        "images": [
          {
            "id": "img-1",
            "url": "http://.../uploads/ads/iphone_thumb.webp",
            "originalUrl": "http://.../uploads/ads/iphone_full.webp"
          }
        ],
        "seller": {
          "id": "usr-5678",
          "name": "Amit Sharma",
          "rating": 4.8,
          "memberSince": "2024-03-12"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 142,
      "totalPages": 8,
      "hasNextPage": true
    }
  }
}
```

---

### 6.2 Get Search Query Autocomplete Suggestions
- **Endpoint:** `GET /api/v1/ads/suggestions?q=iph`
- **Auth:** Public
- **Response:** `["iphone 15", "iphone 14 pro", "iphone 13 128gb"]`

---

### 6.3 Get Listing Details by ID
- **Endpoint:** `GET /api/v1/ads/:id`
- **Auth:** Public (optional token)
- **Response:** Full details including all images, specification attributes, seller verification status, and safety tips.

---

### 6.4 Get Seller Contact Details (Masked / Protected)
Logs lead and returns phone number or chat redirect.
- **Endpoint:** `GET /api/v1/ads/:id/contact`
- **Auth:** Required (`Bearer <token>`)

---

### 6.5 Upload Ad Images (Multipart Form)
Upload photos from Flutter `image_picker` before submitting the ad creation payload.

- **Endpoint:** `POST /api/v1/media/images`
- **Auth:** Required (`Bearer <token>`)
- **Headers:** `Content-Type: multipart/form-data`
- **Body Fields:**
  - `files`: File bytes (Accepts up to 10 files: JPG, PNG, WEBP, max 15MB each).

- **Success Response (201):**
```json
{
  "success": true,
  "data": {
    "mediaIds": ["media-uuid-1", "media-uuid-2", "media-uuid-3"],
    "files": [
      {
        "id": "media-uuid-1",
        "url": "http://.../uploads/ads/ad_1.webp",
        "thumbnailUrl": "http://.../uploads/ads/ad_1_thumb.webp"
      }
    ]
  }
}
```

---

### 6.6 Post a New Ad (Create Listing)
Submit the listing with the `mediaIds` returned from the upload step.

- **Endpoint:** `POST /api/v1/ads`
- **Auth:** Required (`Bearer <token>`)
- **Request Body:**
```json
{
  "title": "OnePlus 12 5G (16GB RAM / 512GB)",
  "description": "Mint condition, used for 3 months with official bill, box and 100W SuperVOOC charger.",
  "price": 52000,
  "negotiable": true,
  "categoryId": "cat-mobiles-uuid",
  "locationId": "loc-andheri-uuid",
  "mediaIds": ["media-uuid-1", "media-uuid-2"],
  "attributes": {
    "brand": "OnePlus",
    "ram": "16GB",
    "storage": "512GB",
    "warranty": "9 months remaining"
  }
}
```

- **Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "ad-created-uuid",
    "status": "PENDING_REVIEW",  // Or "ACTIVE" based on platform policy
    "title": "OnePlus 12 5G (16GB RAM / 512GB)",
    "price": 52000
  },
  "message": "Ad posted successfully and queued for verification."
}
```

---

### 6.7 Update Listing
- **Endpoint:** `PUT /api/v1/ads/:id`
- **Auth:** Required (`Bearer <token>`)
- **Request Body:** Same schema as create ad (can edit price, title, description, attributes).

---

### 6.8 Mark Listing Status (Sold / Active / Deactivated)
- **Endpoint:** `PATCH /api/v1/ads/:id/status`
- **Auth:** Required (`Bearer <token>`)
- **Request Body:**
```json
{
  "status": "SOLD"  // "ACTIVE" | "SOLD" | "DEACTIVATED"
}
```

---

### 6.9 Delete Listing
- **Endpoint:** `DELETE /api/v1/ads/:id`
- **Auth:** Required (`Bearer <token>`)

---

### 6.10 Toggle Bookmark / Favorite
- **Endpoint:** `POST /api/v1/ads/:id/favourite`
- **Auth:** Required (`Bearer <token>`)
- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "isFavourite": true
  },
  "message": "Ad saved to your favorites"
}
```

---

## 7. User Profile & Account Management

### 7.1 Get My Ads (`GET /api/v1/ads/my-ads`)
Lists all advertisements posted by the authenticated user across all statuses (`ACTIVE`, `PENDING_REVIEW`, `SOLD`, `REJECTED`).

- **Endpoint:** `GET /api/v1/ads/my-ads`
- **Auth:** Required (`Bearer <token>`)

---

### 7.2 Get Saved Favorites (`GET /api/v1/user/favourites`)
Lists all ads saved by the authenticated user.

- **Endpoint:** `GET /api/v1/user/favourites`
- **Auth:** Required (`Bearer <token>`)

---

### 7.3 Get & Update User Profile
- **Get Profile:** `GET /api/v1/user/profile`
- **Update Profile:** `PUT /api/v1/user/profile`
- **Auth:** Required (`Bearer <token>`)
- **Update Body:**
```json
{
  "name": "Rahul Verma",
  "bio": "Gadget enthusiast & certified seller",
  "city": "Mumbai",
  "locationId": "loc-uuid-1"
}
```

---

## 8. Real-Time Chat & Messaging

Chat operates on a hybrid architecture:
1. **REST Endpoints** for conversation fetching and offline fallback.
2. **Socket.IO Real-time Engine** for instant bidirectional delivery, live typing indicators, and read receipts.

---

### 8.1 Start or Get Conversation for an Ad
When a buyer taps **"Chat with Seller"** on an Ad details screen, call this endpoint to get or create the conversation thread.

- **Endpoint:** `POST /api/v1/chat/conversations`
- **Auth:** Required (`Bearer <token>`)
- **Request Body:**
```json
{
  "adId": "ad-uuid-1234",
  "initialMessage": "Hi, is this still available?"  // (optional)
}
```

- **Success Response (200 / 201):**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-uuid-9999",
    "ad": {
      "id": "ad-uuid-1234",
      "title": "Apple iPhone 15 Pro",
      "price": 74999,
      "thumbnailUrl": "http://.../thumb.webp"
    },
    "participant": {
      "id": "usr-seller-uuid",
      "name": "Amit Sharma",
      "avatarUrl": "...",
      "isOnline": true
    }
  }
}
```

---

### 8.2 Get User Conversation List (Inbox)
Returns list of all active chat threads sorted by most recent message.

- **Endpoint:** `GET /api/v1/chat/conversations`
- **Auth:** Required (`Bearer <token>`)
- **Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "conv-uuid-9999",
      "unreadCount": 2,
      "lastMessage": {
        "text": "Yes, can you come to Bandra station?",
        "createdAt": "2026-11-15T06:30:00Z",
        "senderId": "usr-seller-uuid"
      },
      "ad": {
        "id": "ad-uuid-1234",
        "title": "Apple iPhone 15 Pro",
        "price": 74999,
        "imageUrl": "..."
      },
      "otherUser": {
        "id": "usr-seller-uuid",
        "name": "Amit Sharma",
        "avatarUrl": "...",
        "isOnline": true
      }
    }
  ]
}
```

---

### 8.3 Get Message History
- **Endpoint:** `GET /api/v1/chat/conversations/:id/messages?limit=30&cursor=<MESSAGE_ID>`
- **Auth:** Required (`Bearer <token>`)

---

### 8.4 Socket.IO Real-Time Chat Engine

Connect to Socket.IO using `socket_io_client` in Flutter:

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

IO.Socket socket = IO.io(
  'http://10.0.2.2:5000',
  IO.OptionBuilder()
    .setTransports(['websocket'])
    .setPath('/socket.io')
    .setAuth({'token': accessToken})
    .enableAutoConnect()
    .enableReconnection()
    .build(),
);
```

#### Socket Events Matrix

| Action | Direction | Event Name | Payload |
| :--- | :---: | :--- | :--- |
| **Join Conversation** | Client → Server | `conversation.join` | `{"conversationId": "conv-uuid"}` |
| **Leave Conversation** | Client → Server | `conversation.leave` | `{"conversationId": "conv-uuid"}` |
| **Send Message** | Client → Server | `message.send` | `{"conversationId": "conv-uuid", "message": "Hello", "messageType": "TEXT"}` |
| **Message Sent Ack** | Server → Client | `message.sent` | `{"messageId": "msg-1", "status": "SENT"}` |
| **Incoming Message** | Server → Client | `message.received` | Full message object *(see below)* |
| **Mark as Read** | Client → Server | `message.read` | `{"conversationId": "conv-uuid"}` |
| **Message Delivered** | Server → Client | `message.delivered` | `{"messageId": "msg-1", "conversationId": "..."}` |
| **Typing Start** | Client → Server | `typing.start` | `{"conversationId": "conv-uuid"}` |
| **Typing Stop** | Client → Server | `typing.stop` | `{"conversationId": "conv-uuid"}` |
| **Incoming Typing** | Server → Client | `typing.start` | `{"conversationId": "conv-uuid", "userId": "..."}` |

#### Incoming Message Object
```json
{
  "id": "msg-uuid-1",
  "conversationId": "conv-uuid-9999",
  "senderId": "usr-seller-uuid",
  "receiverId": "usr-buyer-uuid",
  "message": "Yes, can you meet at 5 PM?",
  "messageType": "TEXT",
  "status": "DELIVERED",
  "createdAt": "2026-11-15T06:45:00.000Z"
}
```

---

## 9. Payments & Ad Promotion Packages

Users can purchase **Featured Boosts** to pin their ad to the top of search results.

### 9.1 Create Payment Order
- **Endpoint:** `POST /api/v1/payments/orders`
- **Auth:** Required (`Bearer <token>`)
- **Request Body:**
```json
{
  "adId": "ad-uuid-1234",
  "purpose": "FEATURED_AD_BOOST",
  "packageType": "BOOST_7_DAYS",
  "amount": 199.00
}
```

- **Success Response (200):**
```json
{
  "success": true,
  "data": {
    "orderId": "ord-uuid-5678",
    "amount": 199.00,
    "currency": "INR",
    "gateway": "PAYU",
    "paymentParams": {
      "key": "PAYU_MERCHANT_KEY",
      "txnid": "txn_173165...",
      "amount": "199.00",
      "productinfo": "Ad Boost Package",
      "firstname": "Rahul",
      "email": "user@example.com",
      "phone": "9876543210",
      "hash": "c5d8a9e7f...",
      "surl": "http://.../api/v1/payments/payu/success",
      "furl": "http://.../api/v1/payments/payu/failure"
    }
  }
}
```

---

### 9.2 Verify Payment & Activate Boost
- **Endpoint:** `POST /api/v1/payments/:id/verify`
- **Auth:** Required (`Bearer <token>`)

---

## 10. Push Notifications (FCM)

When the Flutter app launches, initialize Firebase Messaging and register the device token:

### 10.1 Register FCM Token
- **Endpoint:** `POST /api/v1/notifications/register-token`
- **Auth:** Required (`Bearer <token>`)
- **Request Body:**
```json
{
  "token": "fcm-device-registration-token...",
  "platform": "android"  // "android" | "ios"
}
```

### 10.2 List Notifications
- **Endpoint:** `GET /api/v1/notifications`
- **Auth:** Required (`Bearer <token>`)

### 10.3 Mark Notifications Read
- **Endpoint:** `POST /api/v1/notifications/mark-read`
- **Auth:** Required (`Bearer <token>`)

---

## 11. Safety & Reporting

### 11.1 Report an Ad / Scam
- **Endpoint:** `POST /api/v1/moderation/reports`
- **Auth:** Required (`Bearer <token>`)
- **Request Body:**
```json
{
  "adId": "ad-uuid-1234",
  "reason": "FRAUD_OR_SCAM",  // "SPAM_OR_FRAUD" | "PROHIBITED_ITEM" | "DUPLICATE" | "OFFENSIVE"
  "details": "Seller asking for advance deposit via UPI before meeting."
}
```

### 11.2 Block a User
- **Endpoint:** `POST /api/v1/moderation/blocks`
- **Auth:** Required (`Bearer <token>`)
- **Request Body:**
```json
{
  "blockedUserId": "usr-uuid-to-block",
  "reason": "Abusive chat messages"
}
```

---

## 12. Complete Flutter Implementation Boilerplate

Below is production-ready Dart code to copy directly into your Flutter project's `core/network/` folder.

### 12.1 `api_constants.dart`
```dart
import 'dart:io';

class ApiConstants {
  // Use 10.0.2.2 for Android Emulator, localhost for iOS simulator
  static String get baseUrl {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:5000/api/v1';
    }
    return 'http://localhost:5000/api/v1';
  }

  static String get socketUrl {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:5000';
    }
    return 'http://localhost:5000';
  }
}
```

---

### 12.2 `api_client.dart` (Dio with Auth & Auto Token Refresh)
```dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_constants.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio dio;
  final storage = const FlutterSecureStorage();

  ApiClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-App-Context': 'mobile',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await storage.read(key: 'access_token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // If token expired (401), attempt silent refresh
          if (error.response?.statusCode == 401) {
            final refreshToken = await storage.read(key: 'refresh_token');
            if (refreshToken != null) {
              try {
                final refreshResponse = await Dio().post(
                  '${ApiConstants.baseUrl}/auth/refresh',
                  data: {'refreshToken': refreshToken},
                );

                if (refreshResponse.statusCode == 200) {
                  final newAccessToken = refreshResponse.data['data']['accessToken'];
                  final newRefreshToken = refreshResponse.data['data']['refreshToken'];

                  await storage.write(key: 'access_token', value: newAccessToken);
                  await storage.write(key: 'refresh_token', value: newRefreshToken);

                  // Replay original request with fresh token
                  error.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
                  final retryResponse = await dio.fetch(error.requestOptions);
                  return handler.resolve(retryResponse);
                }
              } catch (e) {
                // Refresh failed; clear session
                await storage.deleteAll();
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }
}
```

---

### 12.3 `socket_service.dart` (Real-Time Chat Engine)
```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'api_constants.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? _socket;
  final storage = const FlutterSecureStorage();

  Future<void> connect() async {
    final token = await storage.read(key: 'access_token');
    if (token == null) return;

    _socket = IO.io(
      ApiConstants.socketUrl,
      IO.OptionBuilder()
        .setTransports(['websocket'])
        .setPath('/socket.io')
        .setAuth({'token': token})
        .enableAutoConnect()
        .enableReconnection()
        .build(),
    );

    _socket?.onConnect((_) {
      print('⚡ [Socket] Connected: ${_socket?.id}');
    });

    _socket?.onDisconnect((reason) {
      print('🔌 [Socket] Disconnected: $reason');
    });
  }

  void joinConversation(String conversationId) {
    _socket?.emit('conversation.join', {'conversationId': conversationId});
  }

  void leaveConversation(String conversationId) {
    _socket?.emit('conversation.leave', {'conversationId': conversationId});
  }

  void sendMessage(String conversationId, String text) {
    _socket?.emit('message.send', {
      'conversationId': conversationId,
      'message': text,
      'messageType': 'TEXT',
    });
  }

  void onMessageReceived(Function(dynamic) callback) {
    _socket?.on('message.received', callback);
  }

  void onMessageDelivered(Function(dynamic) callback) {
    _socket?.on('message.delivered', callback);
  }

  void onMessageRead(Function(dynamic) callback) {
    _socket?.on('message.read', callback);
  }

  void sendTyping(String conversationId, bool isTyping) {
    _socket?.emit(isTyping ? 'typing.start' : 'typing.stop', {
      'conversationId': conversationId,
    });
  }

  void dispose() {
    _socket?.disconnect();
    _socket?.dispose();
  }
}
```

---

## 13. Summary Checklist for Flutter Team

1. [ ] Save base URL in `api_constants.dart`.
2. [ ] Set up `ApiClient` with Dio interceptor for automatic Bearer token injection and silent refresh.
3. [ ] Connect Phone OTP login (`/auth/otp/send` & `/auth/otp/verify`).
4. [ ] Wire `GET /categories/tree` and `GET /locations/cities` to your home page filters.
5. [ ] Wire `GET /ads` to your marketplace search & browse grid with infinite scroll pagination.
6. [ ] Connect `POST /media/images` & `POST /ads` to your **Sell / Post Ad** screen.
7. [ ] Wire `POST /chat/conversations` and `SocketService` to your chat thread UI.
8. [ ] Register FCM token on login via `POST /notifications/register-token`.
