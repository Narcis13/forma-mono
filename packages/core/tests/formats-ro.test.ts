import { describe, expect, test, beforeEach } from "bun:test";
import { FormatRegistry } from "@forma/core";
import { roFormats } from "@forma/core/formats/ro";

describe("Romanian formats", () => {
  beforeEach(() => {
    FormatRegistry.reset();
    FormatRegistry.registerAll(roFormats);
  });

  describe("CUI", () => {
    test("validates CUI with RO prefix", () => {
      const cui = FormatRegistry.get("cui")!;
      expect(cui.validate("RO12345678")).toBe(true);
    });

    test("validates CUI without prefix", () => {
      const cui = FormatRegistry.get("cui")!;
      expect(cui.validate("12345678")).toBe(true);
    });

    test("rejects invalid CUI", () => {
      const cui = FormatRegistry.get("cui")!;
      expect(cui.validate("ABC")).toBe(false);
      expect(cui.validate("")).toBe(false);
      expect(cui.validate("RO")).toBe(false);
    });
  });

  describe("CNP", () => {
    test("validates 13-digit CNP", () => {
      const cnp = FormatRegistry.get("cnp")!;
      expect(cnp.validate("1900101123456")).toBe(true);
    });

    test("rejects invalid CNP length", () => {
      const cnp = FormatRegistry.get("cnp")!;
      expect(cnp.validate("123")).toBe(false);
      expect(cnp.validate("12345678901234")).toBe(false);
    });

    test("rejects non-numeric CNP", () => {
      const cnp = FormatRegistry.get("cnp")!;
      expect(cnp.validate("190010112345a")).toBe(false);
    });
  });

  describe("phone-ro", () => {
    test("validates Romanian mobile", () => {
      const phone = FormatRegistry.get("phone-ro")!;
      expect(phone.validate("0712345678")).toBe(true);
      expect(phone.validate("+40712345678")).toBe(true);
    });

    test("validates Romanian landline", () => {
      const phone = FormatRegistry.get("phone-ro")!;
      expect(phone.validate("0212345678")).toBe(true);
      expect(phone.validate("+40212345678")).toBe(true);
    });

    test("rejects invalid Romanian phone", () => {
      const phone = FormatRegistry.get("phone-ro")!;
      expect(phone.validate("123")).toBe(false);
      expect(phone.validate("+1555123456")).toBe(false);
    });
  });
});
