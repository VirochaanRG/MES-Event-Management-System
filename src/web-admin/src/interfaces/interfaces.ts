export interface Form
{
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface FormQuestion
{
  id: number;
  formId: number;
  questionType: string;
  questionTitle: string | null;
  optionsCategory: string | null;
  qorder: number;
  createdAt: string;
}