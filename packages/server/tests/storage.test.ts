import { describe, expect, test, beforeEach } from "bun:test";
import { InMemoryStorage } from "../src/storage/memory.js";
import { FormBuilder } from "@forma/core";
import type { Submission } from "../src/storage/interface.js";

describe("InMemoryStorage", () => {
  let storage: InMemoryStorage;

  const form = FormBuilder.create("test-form")
    .describe("Test")
    .text("name", { required: true, label: "Name" })
    .build();

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  // --- Forms ---

  test("saveForm and getForm", async () => {
    await storage.saveForm(form);
    const retrieved = await storage.getForm("test-form");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe("test-form");
  });

  test("getForm returns null for missing form", async () => {
    const result = await storage.getForm("nonexistent");
    expect(result).toBeNull();
  });

  test("listForms returns all forms", async () => {
    await storage.saveForm(form);
    const form2 = FormBuilder.create("form-2").describe("d").build();
    await storage.saveForm(form2);
    const list = await storage.listForms();
    expect(list).toHaveLength(2);
  });

  test("saveForm overwrites existing form", async () => {
    await storage.saveForm(form);
    const updated = { ...form, description: "Updated" } as any;
    await storage.saveForm(updated);
    const retrieved = await storage.getForm("test-form");
    expect(retrieved!.description).toBe("Updated");
  });

  test("deleteForm removes form", async () => {
    await storage.saveForm(form);
    await storage.deleteForm("test-form");
    const result = await storage.getForm("test-form");
    expect(result).toBeNull();
  });

  // --- Submissions ---

  test("saveSubmission and getSubmission", async () => {
    await storage.saveForm(form);
    const sub: Submission = {
      id: "sub-1",
      formId: "test-form",
      data: { name: "Alice" },
      createdAt: new Date().toISOString(),
    };
    await storage.saveSubmission("test-form", sub);
    const retrieved = await storage.getSubmission("test-form", "sub-1");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.data.name).toBe("Alice");
  });

  test("listSubmissions returns submissions for a form", async () => {
    await storage.saveForm(form);
    const sub1: Submission = { id: "s1", formId: "test-form", data: { name: "A" }, createdAt: new Date().toISOString() };
    const sub2: Submission = { id: "s2", formId: "test-form", data: { name: "B" }, createdAt: new Date().toISOString() };
    await storage.saveSubmission("test-form", sub1);
    await storage.saveSubmission("test-form", sub2);
    const list = await storage.listSubmissions("test-form");
    expect(list).toHaveLength(2);
  });

  test("getSubmission returns null for missing submission", async () => {
    const result = await storage.getSubmission("test-form", "nonexistent");
    expect(result).toBeNull();
  });
});
