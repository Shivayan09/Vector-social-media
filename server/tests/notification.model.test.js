import Notification, {
  NOTIFICATION_RETENTION_SECONDS,
} from "../src/models/notification.model.js";

describe("Notification model retention", () => {
  it("expires notifications from createdAt so unread rows do not linger forever", () => {
    const ttlIndex = Notification.schema.indexes().find(([fields, options]) => (
      fields.createdAt === 1 && options?.expireAfterSeconds === NOTIFICATION_RETENTION_SECONDS
    ));

    expect(ttlIndex).toBeDefined();
    expect(
      Notification.schema.indexes().some(([fields]) => fields.readAt === 1),
    ).toBe(false);
  });
});
