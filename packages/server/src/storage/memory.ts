import type { FormSchema } from "@forma/core";
import type { StorageAdapter, Submission, ListOpts } from "./interface.js";

export class InMemoryStorage implements StorageAdapter {
  private forms = new Map<string, FormSchema>();
  private submissions = new Map<string, Submission[]>();

  async getForm(id: string): Promise<FormSchema | null> {
    return this.forms.get(id) ?? null;
  }

  async listForms(): Promise<FormSchema[]> {
    return [...this.forms.values()];
  }

  async saveForm(schema: FormSchema): Promise<void> {
    this.forms.set(schema.id, schema);
  }

  async deleteForm(id: string): Promise<void> {
    this.forms.delete(id);
    this.submissions.delete(id);
  }

  async getSubmission(formId: string, submissionId: string): Promise<Submission | null> {
    const subs = this.submissions.get(formId) ?? [];
    return subs.find((s) => s.id === submissionId) ?? null;
  }

  async listSubmissions(formId: string, opts?: ListOpts): Promise<Submission[]> {
    const subs = this.submissions.get(formId) ?? [];
    const offset = opts?.offset ?? 0;
    const limit = opts?.limit ?? subs.length;
    return subs.slice(offset, offset + limit);
  }

  async saveSubmission(formId: string, submission: Submission): Promise<void> {
    if (!this.submissions.has(formId)) {
      this.submissions.set(formId, []);
    }
    this.submissions.get(formId)!.push(submission);
  }
}
