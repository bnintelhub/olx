# OLX ORBIT - Database Backup & Restore Guide

All-in-one complete MySQL dump file: [`olx_marketplace_dump.sql`](./olx_marketplace_dump.sql)

Database Name: `olx_marketplace`  
Dump Date: 03-Nov-2026  
MySQL Version: 8.4+

---

## Included Tables (23 Tables + Data + Triggers + Routines)
- `users`
- `profiles`
- `categories`
- `category_attributes`
- `ads`
- `ad_images`
- `ad_attribute_values`
- `locations`
- `conversations`
- `messages`
- `favourites`
- `featured_ads`
- `saved_searches`
- `notifications`
- `otp_sessions`
- `platform_settings`
- `reports`
- `reviews`
- `banners`
- `blocks`
- `audit_logs`
- `support_tickets`
- `support_ticket_entries`

---

## How to Restore

### Method 1: Using MySQL Command Line (CLI)
```bash
mysql -u root -p < database/olx_marketplace_dump.sql
```
*(Enter your MySQL root password when prompted)*

### Method 2: From Inside MySQL Shell
```sql
SOURCE D:/BN COMPANY/olx-main/database/olx_marketplace_dump.sql;
```

### Method 3: Using MySQL Workbench / phpMyAdmin
1. Open MySQL Workbench or phpMyAdmin.
2. Select **Server** -> **Data Import**.
3. Choose **Import from Self-Contained File** -> Select `olx_marketplace_dump.sql`.
4. Click **Start Import**.

