import { describe, it, expect, beforeAll } from "bun:test";
import { authService } from "../../src/auth/auth-service";
import { initDatabase } from "../../src/db/mysql";

describe("Staff User Mobile Number 10-Digit & Duplicate Validation", () => {
  beforeAll(async () => {
    try {
      await initDatabase();
    } catch {
      // In-memory fallback
    }
  });

  const randSuffix = Math.floor(Math.random() * 100000);

  it("should reject creation when phone is greater than 10 digits (e.g. overlength paste)", async () => {
    const invalidPhone = "+91252654154151515151515151";
    let threw = false;
    try {
      await authService.createUser({
        username: `overlength_user_${randSuffix}`,
        password: "password123",
        role: "STAFF",
        phone: invalidPhone,
      });
    } catch (err: any) {
      threw = true;
      expect(err.message).toContain("10 digits");
    }
    expect(threw).toBe(true);
  });

  it("should reject creation when phone is less than 10 digits", async () => {
    const shortPhone = "98765";
    let threw = false;
    try {
      await authService.createUser({
        username: `short_user_${randSuffix}`,
        password: "password123",
        role: "STAFF",
        phone: shortPhone,
      });
    } catch (err: any) {
      threw = true;
      expect(err.message).toContain("10 digits");
    }
    expect(threw).toBe(true);
  });

  it("should succeed with valid exact 10-digit phone and normalize with country code", async () => {
    const valid10 = "98" + String(randSuffix).padStart(8, "0");
    const user = await authService.createUser({
      username: `valid_staff_${randSuffix}`,
      password: "password123",
      role: "STAFF",
      phone: `+91${valid10}`,
    });

    expect(user.phone).toBe(`+91${valid10}`);
  });

  it("should reject duplicate mobile phone number on creation", async () => {
    const valid10 = "98" + String(randSuffix).padStart(8, "0");
    let threw = false;
    try {
      await authService.createUser({
        username: `dup_staff_${randSuffix}`,
        password: "password123",
        role: "STAFF",
        phone: valid10, // matching without prefix
      });
    } catch (err: any) {
      threw = true;
      expect(err.message).toContain("already registered");
    }
    expect(threw).toBe(true);
  });

  it("should reject updating staff member with another user's phone", async () => {
    const userA = await authService.createUser({
      username: `staff_a_${randSuffix}`,
      password: "password123",
      role: "STAFF",
      phone: "+9199" + String(randSuffix).padStart(8, "1"),
    });

    const userB = await authService.createUser({
      username: `staff_b_${randSuffix}`,
      password: "password123",
      role: "STAFF",
      phone: "+9199" + String(randSuffix).padStart(8, "2"),
    });

    let threw = false;
    try {
      await authService.updateUser(userB.id, {
        phone: userA.phone,
      });
    } catch (err: any) {
      threw = true;
      expect(err.message).toContain("already registered");
    }
    expect(threw).toBe(true);
  });
});
