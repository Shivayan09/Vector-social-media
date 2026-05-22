## Description

The notification system has **zero lifecycle management** — data is created but never cleaned up, causing permanent bloat. Real-time socket delivery is broken for any user with more than one browser tab. The client makes N+1 HTTP requests to mark notifications as read, creating unnecessary load. Together these issues cause unbounded database growth, consistently wrong badge counts, and a broken real-time experience for the common multi-tab usage pattern.

---

## Root Causes & Impact

### 1. Like notification never deleted on unlike

**File:** `server/src/controllers/post.controller.js` (lines 277–303)

`toggleLike` uses `findOneAndUpdate` with `upsert: true` to create a like notification. When the user unlikes (lines 268–272), the notification is **never removed** from the database. The unique partial index on `(recipient, sender, type, post)` with `type: "like"` prevents duplicates on re-like, but the stale "X liked your post" notification persists permanently.

**Impact:** Every single like/unlike cycle leaves a dead notification row. Over time this is unbounded database growth with no cleanup path.

---

### 2. Post deletion orphans notifications and reports

**File:** `server/src/controllers/post.controller.js` (`removePostById`, lines 9–22)

When a post is deleted (by author or via report threshold), `removePostById` cleans up:
- ✅ Cloudinary image (via `imagePublicId`)
- ✅ Comments (via `Comment.deleteMany`)
- ✅ The post itself

But it does **NOT** clean up:
- ❌ Notifications referencing the post (`Notification.deleteMany({ post: postId })`)
- ❌ Reports referencing the post (`Report.deleteMany({ targetType: "post", targetId: postId })`)

In the report-threshold path (`report.controller.js:84`), reports ARE deleted, but notifications are NOT. In the user-delete path (`deletePost` → `removePostById`), **neither** reports nor notifications are cleaned up.

**Impact:** Every deleted post permanently leaks notification and report documents referencing a now-deleted post. These are returned by `getNotifications` and must be filtered at read time, with no way for the user to interact with them.

---

### 3. Comment deletion orphans notifications

**File:** `server/src/controllers/comment.controller.js` (`deleteComment`, lines 70–91)

When a comment is deleted, the controller:
- ✅ Deletes the comment document
- ✅ Decrements `post.commentsCount`

But it does **NOT** clean up:
- ❌ Notifications referencing the comment (`Notification.deleteMany({ $or: [...] })` around the comment's post)

**Impact:** "X commented on your post" notifications persist after the comment is gone. Clicking on them leads nowhere.

---

### 4. No bulk mark-as-read endpoint causes N+1 HTTP requests

**Files:**
- `server/src/controllers/notification.controller.js` (no bulk endpoint)
- `server/src/routes/notification.routes.js` (no bulk route)
- `client/components/NotificationPanel.tsx` (lines 182–202)

The client's `markAllAsRead` function sends **one PUT request per unread notification**:

```typescript
await Promise.all(
  unread.map((n) =>
    axios.put(`${BACKEND_URL}/api/notifications/${n._id}/read`, {})
  )
);
```

A user with 50 unread notifications causes 50 individual HTTP PUT requests, each running a separate MongoDB query. This is both inefficient and a potential rate-limit trigger under automation or rapid polling.

---

### 5. `onlineUsers` map stores only one socket per user, breaking multi-tab

**File:** `server/src/socket/socket.js` (line 50)

```javascript
export const onlineUsers = new Map();     // Map<userId, socketId>
// ...
onlineUsers.set(socket.userId, socket.id);  // overwrites previous tab
```

The `onlineUsers` Map maps `userId → socketId` (string). If a user opens two browser tabs, the second `"register"` event **overwrites** the first tab's entry. The first tab's socket remains alive but is no longer in the map.

**Impact:** Only the **last-opened tab** receives any real-time events. All other tabs silently go dark — no new notifications, no new messages, no message deletions, no follow updates.

---

### 6. All socket emits only reach one user tab

This affects **6 controller files** and **9 separate emit sites**:

| File | Line(s) | Event |
|---|---|---|
| `post.controller.js` | 296–301 | `notification:new` on like |
| `comment.controller.js` | 48–52 | `notification:new` on comment |
| `user.controller.js` | 291–302 | `notification:new` on follow |
| `user.controller.js` | 261–272 | `notification:new` on follow_request |
| `user.controller.js` | 380–391 | `notification:new` on follow_request_accepted |
| `message.controller.js` | 106–118 | `notification:new` + `receive_message` |
| `message.controller.js` | 222–230 | `message_deleted` (via participants loop) |
| `report.controller.js` | 94–100 | `notification:new` on post removed by reports |

Every single one calls `onlineUsers.get(userId)` and emits to that one socket ID.

**Impact:** All real-time features are broken for multi-tab users across the entire application.

---

### 7. Sidebar unread badge count is inaccurate

**File:** `client/components/layouts/Sidebar.tsx` (lines 56–67)

The `fetchUnreadCount` function calls `GET /api/notifications` with **no pagination parameters**, which defaults to `page=1&limit=10` (from `notification.controller.js:6-7`). The badge count is computed from only the first 10 notifications. A user with 47 unread notifications will see a badge of at most 10.

---

### 8. Redundant `onlineUsers.get()` in message controller

**File:** `server/src/controllers/message.controller.js` (lines 107 and 114)

```javascript
const notificationSocket = onlineUsers.get(receiverId.toString());  // line 107
// ...
const receiverSocket = onlineUsers.get(receiverId.toString());      // line 114
```

The same Map lookup is performed twice with the exact same key. The result is only used for socket emits and could easily be reused.

---

## Reproduction

### 1. Stale like notification
1. User A posts a post
2. User B likes the post → notification "B liked your post" appears for A
3. User B unlikes the post → notification remains in A's database, never deleted

### 2. Orphaned post notifications
1. User A comments on User B's post → notification created
2. User B deletes the post → notification referencing `post: deletedPostId` remains in DB
3. A's notification panel may show a notification that links to a non-existent post

### 3. Multi-tab socket loss
1. User A opens the app in Tab 1 → registers socket ID "abc"
2. User A opens the app in Tab 2 → registers socket ID "xyz", overwriting "abc"
3. User B sends User A a message → only Tab 2 receives `receive_message` event
4. Tab 1 shows stale data until next manual refresh or 10-second poll

### 4. Inaccurate badge
1. User accumulates >10 unread notifications
2. Sidebar fetches `GET /api/notifications` (default limit=10)
3. Sidebar shows badge count based on only those 10 — the true count is higher

---

## Proposed Changes

### Server

| File | Change |
|---|---|
| `server/src/socket/socket.js` | Change `onlineUsers` from `Map<userId, string>` to `Map<userId, Set<string>>`. On `"register"`, add socket to Set. On `"disconnect"`, remove from Set (delete key if Set empty). |
| `server/src/controllers/post.controller.js` | **`toggleLike`**: On unlike path (line 268–272), add `Notification.deleteOne({ recipient, sender: userId, type: "like", post: postId })`. **`removePostById`**: Add `Notification.deleteMany({ post: postId })` and `Report.deleteMany({ targetType: "post", targetId: postId })`. Update `toggleLike` emit to iterate over user's socket Set. |
| `server/src/controllers/comment.controller.js` | **`deleteComment`**: Add `Notification.deleteMany({ post: comment.post, sender: comment.author })` (deletes "X commented on your post" notification). Update emit to iterate over socket Set. |
| `server/src/controllers/message.controller.js` | Replace duplicate `onlineUsers.get()` calls with one. Iterate over socket Set for both `notification:new` and `receive_message` emits. |
| `server/src/controllers/user.controller.js` | Update 3 emit sites (follow, follow_request, follow_request_accepted) to iterate over socket Set. |
| `server/src/controllers/report.controller.js` | Update emit to iterate over socket Set. |
| `server/src/controllers/notification.controller.js` | Add `markAllAsRead` endpoint: `PUT /api/notifications/read-all` that sets `isRead: true` for all current user's notifications. |
| `server/src/routes/notification.routes.js` | Add `router.put("/read-all", authMiddleware, markAllAsRead)` |

### Client

| File | Change |
|---|---|
| `client/components/NotificationPanel.tsx` | Replace N+1 `markAllAsRead` with a single `axios.put(BACKEND_URL + "/api/notifications/read-all")` |
| `client/components/layouts/Sidebar.tsx` | Add `?unreadOnly=true` query param or fetch with `limit=0&countOnly=true` to get accurate unread count without fetching full documents. |

---

## Files Requiring Changes

1. `server/src/socket/socket.js`
2. `server/src/controllers/post.controller.js`
3. `server/src/controllers/comment.controller.js`
4. `server/src/controllers/message.controller.js`
5. `server/src/controllers/user.controller.js`
6. `server/src/controllers/report.controller.js`
7. `server/src/controllers/notification.controller.js`
8. `server/src/routes/notification.routes.js`
9. `client/components/NotificationPanel.tsx`
10. `client/components/layouts/Sidebar.tsx`

**Estimated total: ~180–220 lines changed across 10 files.**
