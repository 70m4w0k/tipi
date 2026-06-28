import {
  canKick,
  canPromote,
  canDemote,
  canManageHousehold,
  generateInviteCode,
  countAdmins,
  isLastAdmin,
  COLOR_PRESETS,
  pickAvailableColor,
} from "../lib/household-logic";
import { Profile } from "../lib/types";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "u1",
    email: "test@test.com",
    display_name: "Test",
    color: "#000",
    avatar_url: null,
    household_id: "h1",
    role: "member",
    birthday: null,
    created_at: "",
    ...overrides,
  };
}

describe("canKick", () => {
  it("allows admin to kick a member", () => {
    const admin = makeProfile({ id: "a1", role: "admin" });
    const member = makeProfile({ id: "m1", role: "member" });
    expect(canKick(admin, member)).toBe(true);
  });

  it("prevents admin from kicking themselves", () => {
    const admin = makeProfile({ id: "a1", role: "admin" });
    expect(canKick(admin, admin)).toBe(false);
  });

  it("prevents member from kicking anyone", () => {
    const member1 = makeProfile({ id: "m1", role: "member" });
    const member2 = makeProfile({ id: "m2", role: "member" });
    expect(canKick(member1, member2)).toBe(false);
  });

  it("prevents kicking across households", () => {
    const admin = makeProfile({ id: "a1", role: "admin", household_id: "h1" });
    const member = makeProfile({ id: "m1", role: "member", household_id: "h2" });
    expect(canKick(admin, member)).toBe(false);
  });
});

describe("canPromote", () => {
  it("allows admin to promote a member", () => {
    const admin = makeProfile({ id: "a1", role: "admin" });
    const member = makeProfile({ id: "m1", role: "member" });
    expect(canPromote(admin, member)).toBe(true);
  });

  it("prevents promoting someone already admin", () => {
    const admin1 = makeProfile({ id: "a1", role: "admin" });
    const admin2 = makeProfile({ id: "a2", role: "admin" });
    expect(canPromote(admin1, admin2)).toBe(false);
  });

  it("prevents member from promoting", () => {
    const member1 = makeProfile({ id: "m1", role: "member" });
    const member2 = makeProfile({ id: "m2", role: "member" });
    expect(canPromote(member1, member2)).toBe(false);
  });
});

describe("canDemote", () => {
  it("allows admin to demote another admin", () => {
    const admin1 = makeProfile({ id: "a1", role: "admin" });
    const admin2 = makeProfile({ id: "a2", role: "admin" });
    expect(canDemote(admin1, admin2)).toBe(true);
  });

  it("prevents demoting oneself", () => {
    const admin = makeProfile({ id: "a1", role: "admin" });
    expect(canDemote(admin, admin)).toBe(false);
  });

  it("prevents demoting a non-admin", () => {
    const admin = makeProfile({ id: "a1", role: "admin" });
    const member = makeProfile({ id: "m1", role: "member" });
    expect(canDemote(admin, member)).toBe(false);
  });
});

describe("canManageHousehold", () => {
  it("returns true for admin with household", () => {
    expect(canManageHousehold(makeProfile({ role: "admin" }))).toBe(true);
  });

  it("returns false for member", () => {
    expect(canManageHousehold(makeProfile({ role: "member" }))).toBe(false);
  });

  it("returns false for admin without household", () => {
    expect(canManageHousehold(makeProfile({ role: "admin", household_id: null }))).toBe(false);
  });
});

describe("generateInviteCode", () => {
  it("generates a 6-char alphanumeric code", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[a-z0-9]+$/);
  });

  it("generates different codes", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode()));
    expect(codes.size).toBeGreaterThan(15);
  });
});

describe("countAdmins / isLastAdmin", () => {
  it("counts admins in member list", () => {
    const members = [
      makeProfile({ id: "a1", role: "admin" }),
      makeProfile({ id: "m1", role: "member" }),
      makeProfile({ id: "a2", role: "admin" }),
    ];
    expect(countAdmins(members)).toBe(2);
  });

  it("detects last admin", () => {
    const admin = makeProfile({ id: "a1", role: "admin" });
    const members = [admin, makeProfile({ id: "m1", role: "member" })];
    expect(isLastAdmin(admin, members)).toBe(true);
  });

  it("returns false when multiple admins", () => {
    const admin1 = makeProfile({ id: "a1", role: "admin" });
    const members = [admin1, makeProfile({ id: "a2", role: "admin" })];
    expect(isLastAdmin(admin1, members)).toBe(false);
  });

  it("returns false for non-admin", () => {
    const member = makeProfile({ id: "m1", role: "member" });
    const members = [member, makeProfile({ id: "a1", role: "admin" })];
    expect(isLastAdmin(member, members)).toBe(false);
  });
});

describe("pickAvailableColor", () => {
  it("returns first color when none taken", () => {
    expect(pickAvailableColor([])).toBe(COLOR_PRESETS[0]);
  });

  it("skips taken colors", () => {
    expect(pickAvailableColor([COLOR_PRESETS[0]])).toBe(COLOR_PRESETS[1]);
  });

  it("returns third color when first two taken", () => {
    expect(pickAvailableColor([COLOR_PRESETS[0], COLOR_PRESETS[1]])).toBe(COLOR_PRESETS[2]);
  });

  it("wraps to first color when all taken", () => {
    expect(pickAvailableColor([...COLOR_PRESETS])).toBe(COLOR_PRESETS[0]);
  });

  it("handles non-preset colors gracefully", () => {
    expect(pickAvailableColor(["#FFFFFF", "#000000"])).toBe(COLOR_PRESETS[0]);
  });

  it("finds gap in middle of list", () => {
    const taken = [COLOR_PRESETS[0], COLOR_PRESETS[1], COLOR_PRESETS[3]];
    expect(pickAvailableColor(taken)).toBe(COLOR_PRESETS[2]);
  });
});
