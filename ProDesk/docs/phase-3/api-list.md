ProDesk – API List
Base URL: /api

Authentication: Protected endpoints require a valid authentication token.
1. Authentication & Profile
Method	Endpoint	Description	Access
GET	/api/health	Check backend health	Public
POST	/api/auth/register	Register a new user	Public
POST	/api/auth/login	Authenticate user	Public
GET	/api/auth/me	Get current authenticated user	Authenticated
GET	/api/profile/me	Get current user's profile	Artist, Producer

2. Metadata
Method	Endpoint	Description	Access
GET	/api/metadata/genres	Get all genres	Authenticated
GET	/api/metadata/subgenres	Get all subgenres	Authenticated
GET	/api/metadata/moods	Get all moods	Authenticated
GET	/api/metadata/licenses	Get all beat licenses	Authenticated

3. Beats
Method	Endpoint	Description	Access
GET	/api/beats	Get all beats	Public
GET	/api/beats/my	Get producer's beats	Producer
GET	/api/beats/:id	Get beat details	Public
POST	/api/beats	Create a new beat	Producer
PUT	/api/beats/:id	Update a beat	Producer
DELETE	/api/beats/:id	Delete a beat	Producer
PATCH	/api/beats/:id/restore	Restore a deleted beat	Producer
PATCH	/api/beats/:id/publish	Publish a beat	Producer
PATCH	/api/beats/:id/unpublish	Unpublish a beat	Producer

4. Orders & Cart
Method	Endpoint	Description	Access
POST	/api/orders	Create a new order	Artist
GET	/api/cart	Get the artist's cart	Artist
POST	/api/cart/items	Add an item to the cart	Artist
GET	/api/cart/items	Get cart items	Artist
DELETE	/api/cart/items/:itemId	Remove an item from the cart	Artist

5. Payments & Downloads
Method	Endpoint	Description	Access
POST	/api/payments/:paymentId/complete	Complete a payment	Artist
POST	/api/payments/:paymentId/fail	Mark a payment as failed	Artist
GET	/api/downloads/:orderItemId	Download a purchased beat	Artist
GET	/api/downloads/custom-orders/:customOrderId	Download a delivered custom order	Artist

6. Custom Orders
Method	Endpoint	Description	Access
GET	/api/custom-orders/my	Get user's custom orders	Artist, Producer
POST	/api/custom-orders	Create a custom order	Artist
PATCH	/api/custom-orders/:orderId/propose	Propose price and delivery time	Producer
PATCH	/api/custom-orders/:orderId/reject	Reject a proposal	Artist
PATCH	/api/custom-orders/:orderId/accept	Accept a proposal	Artist
POST	/api/custom-orders/:orderId/deliver	Upload completed custom order	Producer
GET	/api/custom-orders/:orderId/delivery/download	Download custom order delivery	Artist
PATCH	/api/custom-orders/:orderId/complete	Mark custom order as completed	Artist

7. Dashboards
Method	Endpoint	Description	Access
GET	/api/artist/dashboard	Get artist dashboard data	Artist
GET	/api/producer/dashboard	Get producer dashboard data	Producer

8. Producers
Method	Endpoint	Description	Access
GET	/api/featured-producers	Get featured producers	Public
GET	/api/producers	Get all active producers	Artist


Summary
Category	Number of endpoints
Authentication & Profile	5
Metadata	4
Beats	9
Orders & Cart	5
Payments & Downloads	4
Custom Orders	8
Dashboards	2
Producers	2
Total	39