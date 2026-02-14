import type { FormSchema } from "@forma/core";

export interface Submission {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface ListOpts {
  limit?: number;
  offset?: number;
}

export interface StorageAdapter {
  getForm(id: string): Promise<FormSchema | null>;
  listForms(): Promise<FormSchema[]>;
  saveForm(schema: FormSchema): Promise<void>;
  deleteForm(id: string): Promise<void>;

  getSubmission(formId: string, submissionId: string): Promise<Submission | null>;
  listSubmissions(formId: string, opts?: ListOpts): Promise<Submission[]>;
  saveSubmission(formId: string, submission: Submission): Promise<void>;
}
