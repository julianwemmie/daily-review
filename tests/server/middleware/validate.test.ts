import { describe, it, expect, vi } from "vitest";
import { validate } from "../../../src/server/middleware/validate.js";
import { z } from "zod";

function mockReqRes(body: unknown) {
  const req = { body } as any;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;
  const next = vi.fn();
  return { req, res, next };
}

const schema = z.object({
  name: z.string().min(1),
  age: z.number().optional(),
});

describe("validate middleware", () => {
  it("calls next() on valid body", () => {
    const { req, res, next } = mockReqRes({ name: "Alice" });
    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: "Alice" });
  });

  it("replaces body with parsed data (coercion)", () => {
    const { req, res, next } = mockReqRes({ name: "Bob", age: 30, extra: true });
    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.extra).toBeUndefined();
  });

  it("returns 400 on invalid body", () => {
    const { req, res, next } = mockReqRes({ name: "" });
    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
    const errorBody = res.json.mock.calls[0][0];
    expect(errorBody).toHaveProperty("error");
  });

  it("returns 400 when required field is missing", () => {
    const { req, res, next } = mockReqRes({});
    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
