# Mobile & Cross-Platform Strategy Specification
## Project: Engine Que System for Salons
**Document Version:** 2.0.0  
**Status:** Approved Architecture Guideline  

---

## 1. Executive Strategy: The Hybrid Placement Matrix

In the salon and personal grooming industry, attempting to force a single client technology across all touchpoints fails because the physical devices in a barbershop are radically different:
1. **The Mirror Tablet:** Budget $50–$100 Android tablet mounted between two mirrors. Used with wet, greasy hands by multiple barbers.
2. **The Waiting Lounge TV:** A 32" to 55" budget Smart TV running older Android TV, FireOS, or basic WebKit browsers.
3. **The Customer's Phone:** Low-end to high-end smartphones on fluctuating 2G/3G/4G networks.
4. **The Salon Owner's Phone:** Android/iOS smartphone used on-the-go to monitor revenue, staff presence, and payouts.

### The Touchpoint-to-Technology Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│                      TOUCHPOINT-TO-TECH MATRIX                         │
├──────────────────────┬──────────────────┬──────────────────────────────┤
│ Surface              │ Recommended Tech │ Core Reason                  │
├──────────────────────┼──────────────────┼──────────────────────────────┤
│ Customer Door QR     │ Next.js / HTML5  │ Zero-download guest access,  │
│                      │ (<25KB bundle)   │ instant 2G/3G load time      │
├──────────────────────┼──────────────────┼──────────────────────────────┤
│ Waiting Lounge TV    │ Continuous Web   │ Zero memory leak, auto-heal  │
│                      │ (WebSocket / PWA)│ WebSocket, no TV app store   │
├──────────────────────┼──────────────────┼──────────────────────────────┤
│ Shared Mirror Tablet │ PWA (Installable)│ 1-tap PIN switch, instant OTA│
│                      │ with Offline SW  │ updates without Google Play  │
├──────────────────────┼──────────────────┼──────────────────────────────┤
│ Salon Owner Mobile   │ Native Flutter   │ Reliable FCM Push alerts,    │
│                      │ (Android / iOS)  │ offline charts, biometric auth│
├──────────────────────┼──────────────────┼──────────────────────────────┤
│ Consumer Mobile App  │ Native Flutter   │ Appointment push reminders,  │
│ (Future Loyalty)     │ (Android / iOS)  │ loyalty points, nearby search│
└──────────────────────┴──────────────────┴──────────────────────────────┘
```

---

## 2. Framework Comparison: Flutter vs React Native vs PWA

| Dimension | **PWA (Progressive Web App)** | **Flutter (Google Dart)** | **React Native (Expo)** |
|---|---|---|---|
| **Primary Strength** | **Zero Install Friction** | **Pixel-Perfect 60fps Native UI** | **Shared React Components** |
| **App Store Review** | ❌ None (Deploys in seconds) | ⚠️ Google Play / Apple Review | ⚠️ App Store Review |
| **Mirror Tablet Suitability**|  **Ideal** (Full-screen kiosk) | ⚠️ Overhead of APK sideloading | ⚠️ Overhead of APK sideloading |
| **Push Notifications** | ⚠️ Flaky on budget Android WebKit|  **Rock-solid FCM background push**|  Solid FCM background push |
| **Bluetooth Thermal Printer**| ⚠️ Complex WebBluetooth |  **Direct ESC/POS Bluetooth socket**|  Bluetooth socket via native lib |
| **Codebase Sharing** | Shared directly with Web | Separate Dart codebase | Shared React state/logic |
| **Recommendation** | **Mirror Tablets & Smart TVs** | **Dedicated Mobile Android Apps**| Alternative to Flutter |

---

## 3. Dedicated Android Mobile App Architecture (Flutter)

When building the native mobile application for Salon Owners and Stylists:
* **Framework:** **Flutter v3.x+ (Dart)**
* **State Management:** **Riverpod** or **Bloc**
* **Networking:** Clean HTTP client (`dio`) communicating directly with our **Bun v1.4 + ElysiaJS** headless REST API endpoints.
* **Real-time Updates:** WebSocket channel client (`web_socket_channel`) connecting to `/ws?salonId=...`.
* **Push Notifications:** **Firebase Cloud Messaging (FCM)** for background notifications:
  * *"Chair Ready alert"*
  * *"Daily Revenue Summary: ₹4,850 earned today"*
  * *"New Booking from VIP Client"*

---

## 4. Hardware Integration Specifications

### A. Bluetooth Thermal Receipt Printers (ESC/POS 58mm & 80mm)
* For busy barbershops that still want physical paper tickets for walk-ins:
  * Handled via **Flutter Native ESC/POS Bluetooth driver** on Android, or **Web Thermal Print API** on Chrome Android tablets.
  * Formatted output:
    ```
    ================================
       RAMESH TRADITIONAL BARBER
    ================================
    TICKET NUMBER: #102
    CUSTOMER: Rahul Verma
    SERVICE: Haircut & Shave
    ESTIMATED WAIT: 20 MINS
    --------------------------------
    Relax nearby. We will alert your
    phone when your chair is ready!
    ================================
    ```

### B. Smart TV Departure Boards
* Cheap Smart TVs running older browser engines (Chromium 69–85) suffer from memory bloat if single-page applications leak DOM nodes.
* **Engineering Mandate:** The TV departure board view (`/s/:slug/tv`) MUST:
  1. Use zero heavy animation frameworks (CSS transforms only).
  2. Implement a self-healing WebSocket watchdog: if no ping is received for 30 seconds, close and reconnect automatically.
  3. Reload the browser window every 12 hours (`location.reload()`) during low-traffic night hours to flush garbage collection.
