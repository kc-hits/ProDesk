03 - User Roles
1. Introduction

ProDesk uses a role-based access control (RBAC) system to manage user permissions and restrict access to platform features.

Each user is assigned a specific role that determines the actions they can perform and the resources they can access.

The MVP defines three primary user roles:

Artist
Producer
Administrator

Each role has a dedicated set of features and permissions based on its responsibilities within the platform.

2. Artist
2.1. Description

An Artist is a registered user who uses ProDesk to discover, preview, and purchase music beats for personal or commercial music projects.

Artists can also request custom beat productions from Producers.

2.2. Main Responsibilities
Discover available music beats.
Search and filter beats based on musical characteristics.
Preview beats before purchasing.
Purchase available beat licenses.
Access purchased files.
Manage personal information.
Follow Producers.
Save favorite beats.
Submit ratings and reviews.
Create custom beat requests.
Communicate with Producers regarding custom orders.
Track purchase and custom order history.
2.3. Permissions

Artists can:

View public beat listings.
View public Producer profiles.
Purchase available licenses.
Download files associated with their purchases.
Manage their own favorites and followed Producers.
Submit and manage their own reviews.
Create and manage their own custom orders.
Access their personal dashboard.

Artists cannot:

Publish or manage beats.
Access another user's private purchase information.
Modify Producer profiles.
Access administrative features.
Redistribute purchased original beat files without authorization.
3. Producer
3.1. Description

A Producer is a registered user who creates instrumental music and uses ProDesk to publish, promote, and sell music beats.

Producers can also receive custom production requests from Artists.

3.2. Main Responsibilities
Create and manage a professional Producer profile.
Publish new beats.
Upload beat cover images and audio files.
Manage beat information and metadata.
Define prices and available licensing options.
Manage beat versions.
Monitor sales and earnings.
Track beat views and preview plays.
Receive and manage custom beat requests.
Communicate with Artists.
Deliver completed custom productions.
Monitor ratings and customer reviews.
3.3. Permissions

Producers can:

Create, edit, and delete their own beats.
Manage their own audio and image files.
View public Artist profiles when available.
Access their own sales information.
View their own earnings and performance statistics.
Manage custom orders assigned to them.
View reviews associated with their profile and products.
Manage their own profile information.

Producers cannot:

Modify another Producer's beats.
Access another Producer's private sales information.
Access private Artist purchase records unrelated to their transactions.
Modify platform-wide settings.
Access administrative features.
Download or redistribute files belonging to other Producers without authorization.
4. Administrator
4.1. Description

An Administrator is a privileged user responsible for managing, monitoring, and maintaining the ProDesk platform.

Administrators ensure that the platform operates correctly and that users follow platform policies.

4.2. Main Responsibilities
Manage registered users.
Monitor Artist and Producer accounts.
Review and moderate published beats.
Manage platform content.
Monitor purchases and transactions.
Review reported content and user activities.
Monitor custom order activities when necessary.
Manage predefined musical metadata.
Maintain platform integrity and security.
4.3. Permissions

Administrators can:

View and manage user accounts.
Suspend or deactivate accounts when necessary.
Review and moderate beat listings.
Manage predefined Genres and Subgenres.
Manage predefined Moods, BPM values, and musical Keys.
Review reported content and reviews.
Monitor purchases and payment records.
Access platform-wide statistics.
Manage platform settings and content.

Administrative access must be protected and restricted to authorized personnel.

5. Role Comparison
Feature	Artist	Producer	Admin
Browse beats	Yes	Yes	Yes
Preview beats	Yes	Yes	Yes
Purchase beats	Yes	No	No
Publish beats	No	Yes	No
Manage own beats	No	Yes	No
Manage own profile	Yes	Yes	No
Follow Producers	Yes	Yes	No
Manage purchases	Own	Related sales	Monitor
Manage custom orders	Own requests	Assigned requests	Monitor
Submit reviews	Yes	No	No
Manage users	No	No	Yes
Moderate content	No	No	Yes
Manage metadata	No	No	Yes
View platform statistics	No	Own statistics	Global
6. Role-Based Access Control

ProDesk implements role-based access control to ensure that users can only access features and resources permitted by their assigned roles.

The authorization system must enforce permissions on the backend, not only through frontend route restrictions.

Protected areas include:

Artist dashboard.
Producer dashboard.
Administrative dashboard.
Purchase and download resources.
Beat management resources.
Custom order management resources.

Every protected operation must verify both the user's role and ownership of the requested resource where applicable.

7. Future Considerations

The role system should be designed to support additional roles in future development phases.

Potential future roles may include:

Moderator
Music Label
Studio Manager
Platform Support Agent

These roles are not part of the initial MVP but may be introduced as the platform grows.