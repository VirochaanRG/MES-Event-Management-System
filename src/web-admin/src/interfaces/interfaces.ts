export interface Form
{
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  isPublic: boolean;
  moduleId: number;
  isModular: boolean;
  unlockAt: string | null;
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
  required: boolean
}

export interface Event
{
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  capacity: number;
  isPublic: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthUser
{
  email: string;
  id: number;
  roles: string[];
}

export interface FormCondition
{
  text: string;
  id: number;
  formId: number;
  modFormId: number;
  dependentFormId: number;
  dependentModFormId: number;
  conditionType: string;
  dependentQuestionId: number;
  dependentAnswer: string;
}

export interface FormProfileCondition
{
  id: number;
  formId: number;
  profileField: "faculty" | "program" | "isMcmasterStudent";
  expectedValue: string;
}