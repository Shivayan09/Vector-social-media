import { shouldUseRedisAdapter } from "../src/socket/socket.js";

describe("Socket Redis adapter selection", () => {
  it("disables the Redis adapter when REDIS_URL is missing", () => {
    expect(shouldUseRedisAdapter("")).toBe(false);
    expect(shouldUseRedisAdapter("   ")).toBe(false);
  });

  it("enables the Redis adapter when REDIS_URL is configured", () => {
    expect(shouldUseRedisAdapter("redis://localhost:6379")).toBe(true);
  });
});
