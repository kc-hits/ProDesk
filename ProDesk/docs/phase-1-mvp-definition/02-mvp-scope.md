02 - MVP Scope
1. Introduction

The Minimum Viable Product (MVP) of ProDesk represents the first functional version of the platform.

The purpose of this version is to establish the core marketplace experience by enabling Artists to discover and purchase music beats, Producers to publish and sell their creations, and Administrators to manage the platform.

The MVP focuses on essential features that validate the platform's main business model while maintaining a clear, scalable, and maintainable technical foundation.

2. In-Scope Features

The following features are included in the initial release of ProDesk.

2.1. Authentication and User Management
User registration and login.
User logout.
Password recovery and reset.
Role-based access control.
Support for Artist and Producer accounts.
User profile management.
Administrator account and management capabilities.
2.2. Artist Features
Browse available beats.
Search and filter beats.
View beat details.
Play beat previews.
View Producer profiles.
Follow Producers.
Add beats to favorites.
Add beats to the shopping cart.
Purchase beat licenses.
Access purchased beats and download permitted files.
View purchase history.
Submit ratings and reviews.
Submit custom beat production requests.
Manage personal profile information.
2.3. Producer Features
Create and manage a Producer profile.
Publish new beats.
Edit and delete published beats.
Upload beat cover images.
Upload original beat files and preview files.
Manage beat versions and licensing options.
Define beat prices.
Select musical metadata, including:
Genre
Subgenre
Mood
BPM
Musical Key
Related Artists
View sales statistics.
View beat views and preview plays.
Track earnings.
Manage incoming custom beat requests.
View customer reviews and ratings.
2.4. Beat Marketplace
Public beat catalog.
Beat detail pages.
Beat search functionality.
Filtering by musical characteristics.
Beat preview playback.
Producer information on beat pages.
Display of beat prices and available licenses.
Support for multiple beat versions.
2.5. Shopping and Payments
Shopping cart management.
Order creation.
Payment processing.
Purchase history.
Order status management.
Secure access to purchased files.
Storage of transaction information.
2.6. Custom Beat Orders
Artists can submit custom beat requests.
Artists can describe their musical requirements.
Producers can receive and review requests.
Producers can accept or reject requests.
Artists and Producers can communicate about orders.
Custom order status tracking.
File delivery and order completion.
2.7. Producer Profiles and Social Features
Public Producer profiles.
Display of published beats.
Display of sales count.
Display of follower count.
Display of ratings and reviews.
Follow and unfollow functionality.
Artist reviews and ratings.
2.8. Administrator Features
Administrator dashboard.
User management.
Producer management.
Beat management.
Purchase and transaction monitoring.
Custom order monitoring.
Review and report management.
Platform content moderation.
3. Beat Metadata and Upload Rules

The MVP includes structured musical metadata to improve beat discovery and organization.

The initial rules are:

Each beat belongs to one predefined Genre.
Each beat has one Subgenre associated with its selected Genre.
Each beat has one Mood selected from a predefined list.
BPM is selected from predefined values.
Musical Key is selected from a standardized list.
Producers can select existing Artists or enter new Artist names.
Beat cover images support common image formats.
Original beat files and preview files have a maximum upload size of 50 MB each.
Preview files support common audio formats.
The original beat file is provided in MP3 format.
4. Licensing and Usage Rules

ProDesk provides licensing options that define how purchased beats may be used.

The initial licensing requirements include:

Purchased licenses must clearly describe permitted usage.
Commercial use is permitted under the selected license.
Artists must credit the Producer when required by the license.
Purchased original files cannot be freely redistributed or shared with other users.
Download permissions are restricted to authorized purchasers.
Licensing information must be visible before purchase.
5. Out-of-Scope Features

The following features are not included in the initial MVP unless their implementation becomes necessary:

Native Android and iOS applications.
Live audio collaboration between Artists and Producers.
Real-time audio editing inside the platform.
Advanced AI-based beat recommendations.
AI-generated music.
Built-in professional Digital Audio Workstation (DAW).
Subscription-based membership plans.
International multi-currency payment support.
Complex affiliate and referral programs.
Advanced marketing automation.

These features may be considered in future development phases.

6. MVP Success Criteria

The MVP will be considered functionally successful when:

Users can register, log in, and access role-specific areas.
Producers can publish and manage beats.
Artists can discover and preview available beats.
Artists can complete purchases through the platform.
Purchased files are accessible only to authorized users.
Producers can monitor their sales and earnings.
Artists can submit custom beat requests.
Administrators can manage users, beats, and platform activities.
Licensing conditions are clearly presented and enforced.
7. MVP Development Principle

The MVP should prioritize functionality, usability, security, and maintainability over unnecessary complexity.

Features should be implemented incrementally, with each major module tested before moving to the next development stage.

The architecture should also allow future expansion without requiring major changes to the core system.