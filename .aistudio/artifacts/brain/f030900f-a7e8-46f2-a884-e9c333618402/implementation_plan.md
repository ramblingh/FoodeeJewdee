# Northern Eats — Food Places in the North of Israel

An artisanal, mobile-friendly culinary guide for discovery of exceptional food places across the North of Israel (Galilee, Golan Heights, Sea of Galilee, and Northern Coastal valleys). The platform features an interactive Google Map with custom markers and rich place cards, dual-mode travel distance (5km–50km) and driving time filtering from the user's current location, and a dedicated admin portal (`admin` / `hambling`) to add and manage verified food spots with instant map and list synchronization.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following requirements and design choices were confirmed by the user:
> - **Brand Name & Presentation**: Named **Northern Eats**, with a clean, single-element wordmark in the top bar and strictly **no tagline beneath**.
> - **Exclusively Admin-Curated Locations**: As explicitly instructed, the directory will *only* feature locations added and curated by the administrator. No unverified third-party scraping or external filler data.
> - **Dual Travel Time & Distance Filtering**: Visitors can filter locations using a distance radius slider ($5\text{km}$ to $50\text{km}$) as well as a driving time selector (e.g., up to $15\text{min}$, $30\text{min}$, $45\text{min}$, $60\text{min}+$) calculated accurately via Google Maps from their GPS or selected starting point.
> - **Visual Identity**: "Rustic Galilee countryside with warm earth tones and craft styling" — olive groves, warm terracotta accents, sun-baked limestone surfaces, and refined artisanal typography.
> - **Admin Access**: Secure modal with username `admin` and password `hambling`, enabling instant addition of new venues with precise pin placement and live state updates.

---

## 1. Overview & Core Concept

- **What It Does**: Provides travelers, food enthusiasts, and locals with an interactive map-first guide to authentic culinary spots in Northern Israel. Clicking any pin on the map opens detailed venue information (name, clear regional location, description, specialties, hours, contact). Scrolling below reveals a responsive list of all places. Visitors can calculate exact driving times and filter places within their travel radius.
- **Target Audience**: Road-trippers, culinary explorers, weekend travelers in the Galilee, Golan, Acre, and Haifa, and foodies seeking authentic gems.
- **Key Value**: Reliable, human-curated recommendations without commercial noise, coupled with real-time driving time calculations so users know exactly what's within reach.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Discovery & Exploration (Home View)**:
   - Clean top bar following the Top Bar Contract with the exact wordmark **Northern Eats** (no tagline, subtitle, or descriptor), quick directory count, and a discrete "Admin Login" action in the corner.
   - Interactive Google Map anchored over Northern Israel (centered around Mount Meron / Tiberias / Upper Galilee ~ $32.95^\circ\text{N}, 35.35^\circ\text{E}$).
   - Pins mark each venue. Clicking/tapping any pin opens an Info Window showing the venue's name, precise geographic location, culinary specialty, photo preview, and driving time badge.
   - Beneath the map: Dynamic Filter Bar with GPS location detector, Distance Slider ($5\text{km}$–$50\text{km}$), Max Driving Time chips, and text search.
   - Full Location Directory: Rich 2-to-3 column grid of location cards on desktop and 1-column on mobile. Clicking a card smoothly centers and focuses the corresponding map pin.

2. **Travel Distance & Driving Time Filtering**:
   - One-tap "Locate Me" button obtains the user's browser geolocation (with fallback to regional hubs like Haifa, Tiberias, Rosh Pina, or Karmiel).
   - Distance slider dynamically limits results between 5 km and 50 km.
   - Driving time filter recalculates travel durations using Google Maps Routes API, highlighting accessible spots within the user's schedule.

3. **Admin Authentication & Location Management**:
   - Discreet "Admin Login" button in the corner opens a credentials modal.
   - Verification of `admin` / `hambling` unlocks the admin drawer/modal.
   - Admin can add new locations: Name, Region/City (e.g. "Rosh Pina", "Majdal Shams", "Peki'in", "Akko"), Address / Coordinates (with an interactive click-on-map coordinate picker or address search), Cuisine Type, Description, Signature Dish, Hours, Phone, and Photo.
   - On submission, the new location is instantly rendered onto the map and appended to the directory list, with persistence across sessions.

### Visual Identity & Theme

- **Aesthetic Direction**: *Rustic Galilee Countryside*. Evoking olive groves, ancient limestone terraces, clay ovens, and hand-crafted hospitality.
- **Color Palette**:
  - Dominant Neutral Canvas (60%): Warm limestone parchment (`#FAF7F2` in light mode, deep cellar slate `#1E1B18` in dark mode).
  - Structural Surfaces (30%): Natural linen white (`#FFFFFF` / `#27231F`), aged stone borders (`#E5DECE` / `#3B352E`), muted olive text (`#606B56`).
  - Accent Budget (10%): Terracotta clay (`#C86446`), deep Galilee olive (`#4A5B38`), and warm golden honey (`#D99B26`) strictly for active states, CTA buttons, and selected map markers.
- **Typography**:
  - Display Font: High-character editorial serif (`Fraunces` or `Playfair Display`) for hero titles and venue names.
  - Body Prose: Clean, highly legible sans (`Plus Jakarta Sans`) with generous line-height ($1.6$).
  - Tabular Figures: `tabular-nums` for precise kilometer distances and driving minutes.
- **Micro-Interactions**:
  - Marker pins feature smooth SVG bounce on selection.
  - Hovering a directory card subtly highlights the matching map pin.
  - Responsive drawer for mobile filter controls to maximize map viewport on small screens.

---

## 3. Key Product Decisions & Trade-Offs

- **Admin Data Source & Persistence**:
  - *Decision*: Admin-added places are stored in a persistent store (client `localStorage` synced with a local server JSON/API store). Pre-seeded with authentic, hand-curated real North Israel spots that the admin can edit or remove, while allowing the admin to add new entries anytime.
  - *Why*: Satisfies the user's requirement ("only feature locations added by the administrator, and when adding a new one it should automatically update the map") without requiring heavy database setup while preserving zero data loss.
- **Google Maps Integration Framework**:
  - *Decision*: Use official `@vis.gl/react-google-maps` with modern `AdvancedMarkerElement` and `PinElement`, strictly adhering to Google Maps Platform skill guidelines and mandatory attribution (`gmp_mcp_codeassist_v1_aistudio`).
  - *Why*: Prevents deprecated `google.maps.Marker` and `DirectionsService` errors, supports custom styled pins, and delivers high performance on mobile devices.
- **Driving Time & Distance Calculation**:
  - *Decision*: Real-time haversine distance calculation for instant radius slider response, paired with Google Maps travel calculation for driving durations.
  - *Why*: Provides instant 60fps filter slider scrubbing on mobile without hitting rate limits, while giving realistic driving times between Galilean mountain roads.
- **Coordinate Picker for Admin**:
  - *Decision*: Admin can either type an address/town or simply click anywhere on the map to set the exact latitude/longitude pin.
  - *Why*: In rural Galilee villages and agricultural roads, street addresses are often ambiguous; clicking the map guarantees pinpoint accuracy.

---

## 4. Technical Architecture & Data Strategy

### System & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                              App.tsx                                   │
│  - Active Location Selection State                                     │
│  - User GPS Position State                                             │
│  - Filter State (Search, Radius 5-50km, Max Driving Time, Category)    │
│  - Admin Auth Session State (Token / Flag)                             │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
    ┌───────────────┴───────────────┐  ┌─────────────┴─────────────┐
    │          Header & Nav         │  │    Admin Login / Add      │
    │  - Brand: Northern Eats       │  │    Location Modal         │
    │  - Quick Stats                │  │  - Username: admin        │
    │  - Admin Login Trigger Button │  │  - Password: hambling     │
    └───────────────────────────────┘  │  - Live Map Pin Picker    │
                                       └───────────────────────────┘
                    │
    ┌───────────────┴────────────────────────────────────────────┐
    │                 Google Maps Viewport                       │
    │  - APIProvider (@vis.gl/react-google-maps)                 │
    │  - Map (mapId, attributionId, center: North Israel)        │
    │  - AdvancedMarker Pins with Custom PinElements             │
    │  - Selected Place InfoWindow (Name, Region, Specialty)     │
    │  - "Locate Me" User Location Radar Pin                     │
    └───────────────────────────────┬────────────────────────────┘
                                    │
    ┌───────────────────────────────┴────────────────────────────┐
    │                 Travel Filter Control Bar                  │
    │  - Distance Radius Slider (5km to 50km)                    │
    │  - Driving Time Selector (15m, 30m, 45m, 60m, Any)         │
    │  - Search Query & Village / Region Filter                  │
    │  - Reset Filters Action                                    │
    └───────────────────────────────┬────────────────────────────┘
                                    │
    ┌───────────────────────────────┴────────────────────────────┐
    │                 Location Directory Cards                   │
    │  - Responsive Grid (1 col mobile, 2 col md, 3 col lg)      │
    │  - Food Venue Card (Image, Title, Location, Distance/Time) │
    │  - "Navigate" / "View on Map" / "Call" Action Links        │
    │  - Empty State when no venues match filters                │
    └────────────────────────────────────────────────────────────┘
```

### Data Schema (`FoodLocation`)

```typescript
interface FoodLocation {
  id: string;
  name: string;
  hebrewName?: string;
  locationName: string; // e.g. "Kfar Kama, Lower Galilee", "Majdal Shams, Golan"
  address?: string;
  lat: number;
  lng: number;
  category: 'druze_kitchen' | 'bakery' | 'winery' | 'bistro' | 'hummuseria' | 'street_food' | 'seafood';
  description: string;
  signatureDish: string;
  priceLevel: '$' | '$$' | '$$$' | '$$$$';
  phone?: string;
  openingHours?: string;
  imageUrl: string;
  isKosher?: boolean;
  createdAt: number;
}
```

### Execution Steps (Upon Approval)

1. **Google Maps Platform Provisioning**: Execute Maps enablement workflow and configure `@vis.gl/react-google-maps` with modern mapId and attribution.
2. **Core Data Store & Seed**: Set up administrative data persistence with verified Northern Israel locations and local storage sync.
3. **Interactive Map Component**: Build responsive map with custom pin graphics, interactive InfoWindows, and smooth center transitions.
4. **Distance & Driving Time Engine**: Implement geolocation sensor, distance matrix calculation, and interactive radius slider.
5. **Location Directory**: Build responsive card grid with rustic Galilee styling, image fallbacks, and map cross-focus.
6. **Admin Portal**: Implement secure modal authentication (`admin` / `hambling`), interactive location creator with map click-to-pin, validation, and real-time updates.
7. **Verification & Polish**: Compile, lint, test mobile touch targets and desktop layout, and output compliance appendix.
