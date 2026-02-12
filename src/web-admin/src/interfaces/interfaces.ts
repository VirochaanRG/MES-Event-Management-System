export interface Form
{
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  isPublic: boolean;
  moduleId: number;
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
  required : boolean
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
  id: number;
  formId : number;
  dependentFormId : number;
  conditionType: string;
  dependentQuestionId : number;
  dependentAnswerIdx : number;
}