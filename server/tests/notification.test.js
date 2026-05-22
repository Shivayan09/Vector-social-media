import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/user.model.js";
import Notification from "../src/models/notification.model.js";

describe("Notification Endpoints", () => {
  let cookie;
  let user;

  const testUser = {
    name: "Notify",
    surname: "Tester",
    phoneNumber: "1234567890",
    email: "notify@test.com",
    password: "password123",
    username: "notifytester",
    bio: "Test bio",
    description: "Test description",
  };

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(testUser);
    const loginRes = await request(app).post("/api/auth/login").send({
      username: testUser.username,
      password: testUser.password,
    });

    cookie = loginRes.headers["set-cookie"];
    user = await User.findOne({ username: testUser.username });
  });

  it("returns notifications for the logged in user", async () => {
    const otherUser = await User.create({
      name: "Other",
      surname: "User",
      phoneNumber: "9999999999",
      email: "other@test.com",
      password: "password123",
      username: "otheruser",
      bio: "Other bio",
      description: "Other description",
    });

    await Notification.create({
      recipient: user._id,
      sender: otherUser._id,
      type: "follow",
      isRead: false,
    });

    await Notification.create({
      recipient: user._id,
      sender: otherUser._id,
      type: "message",
      isRead: true,
    });

    await Notification.create({
      recipient: otherUser._id,
      sender: user._id,
      type: "like",
    });

    const response = await request(app)
      .get("/api/notifications")
      .set("Cookie", cookie);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].type).toBe("message");
    expect(response.body[1].type).toBe("follow");
  });

  it("marks a notification as read", async () => {
    const notification = await Notification.create({
      recipient: user._id,
      type: "like",
    });

    const response = await request(app)
      .put(`/api/notifications/${notification._id}/read`)
      .set("Cookie", cookie);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    const updatedNotification = await Notification.findById(notification._id);
    expect(updatedNotification.isRead).toBe(true);
  });

  it("returns 500 when marking a notification as read with an invalid id", async () => {
    const response = await request(app)
      .put("/api/notifications/invalid-id/read")
      .set("Cookie", cookie);

    expect(response.statusCode).toBe(500);
  });

  it("deletes a notification", async () => {
    const notification = await Notification.create({
      recipient: user._id,
      type: "comment",
    });

    const response = await request(app)
      .delete(`/api/notifications/${notification._id}`)
      .set("Cookie", cookie);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(await Notification.findById(notification._id)).toBeNull();
  });

  it("returns 404 when deleting a notification that does not exist", async () => {
    const response = await request(app)
      .delete(`/api/notifications/${new mongoose.Types.ObjectId()}`)
      .set("Cookie", cookie);

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Notification not found");
  });

  it("returns 500 when deleting a notification with an invalid id", async () => {
    const response = await request(app)
      .delete("/api/notifications/invalid-id")
      .set("Cookie", cookie);

    expect(response.statusCode).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Server error");
  });

  it("deletes all notifications for the logged in user", async () => {
    const otherUser = await User.create({
      name: "Delete",
      surname: "All",
      phoneNumber: "8888888888",
      email: "deleteall@test.com",
      password: "password123",
      username: "deletealluser",
      bio: "Delete bio",
      description: "Delete description",
    });

    await Notification.create([
      { recipient: user._id, type: "follow" },
      { recipient: user._id, type: "message" },
      { recipient: otherUser._id, type: "comment" },
    ]);

    const response = await request(app)
      .delete("/api/notifications/all")
      .set("Cookie", cookie);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Notifications deleted");
    expect(await Notification.countDocuments({ recipient: user._id })).toBe(0);
    expect(await Notification.countDocuments({ recipient: otherUser._id })).toBe(1);
  });

  it("bulk deletes notifications", async () => {
    const notifications = await Notification.create([
      { recipient: user._id, type: "follow" },
      { recipient: user._id, type: "message" },
    ]);

    const response = await request(app)
      .post("/api/notifications/bulk-delete")
      .set("Cookie", cookie)
      .send({ ids: notifications.map((notification) => notification._id) });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(await Notification.countDocuments({ recipient: user._id })).toBe(0);
  });

  it("returns 400 when bulk delete request is invalid", async () => {
    const response = await request(app)
      .post("/api/notifications/bulk-delete")
      .set("Cookie", cookie)
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid request");
  });

  it("returns 500 when bulk delete receives an invalid id", async () => {
    const response = await request(app)
      .post("/api/notifications/bulk-delete")
      .set("Cookie", cookie)
      .send({ ids: ["invalid-id"] });

    expect(response.statusCode).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Server error");
  });
});
