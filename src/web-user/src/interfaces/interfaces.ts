//Forms.
export interface Form
{
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  isPublic: boolean;
  moduleId: number;
  unlockAt: string;
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
  parentQuestionId: number | null;
  enablingAnswers: number[];
  required: boolean;
}

export interface FormAnswer
{
  id: number;
  userId: number;
  formId: number;
  questionId: number;
  questionType: string;
  answer: string | string[];
  createdAt: string;
}

export interface FormResponse
{
  question: FormQuestion;
  answer: FormAnswer | undefined;
}