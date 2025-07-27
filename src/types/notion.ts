export const NotionProperties = {
  TASK: "Task",
  INBOX: "Inbox",
  KANBAN_STATE: "Kanban - State",
  PRIORITY: "Priority",
  DUE: "Due",
  DONE: "Done",
} as const;

// --- Notion API Response Types ---

interface NotionPropertyBase {
  id: string;
  type: string;
}

export interface TitleProperty extends NotionPropertyBase {
  type: "title";
  title: {
    text: {
      content: string;
    };
    plain_text: string;
  }[];
}

export interface CheckboxProperty extends NotionPropertyBase {
  type: "checkbox";
  checkbox: boolean;
}

export interface SelectProperty extends NotionPropertyBase {
  type: "select";
  select: null | {
    id: string;
    name: string;
    color: string;
  };
}

export interface DateProperty extends NotionPropertyBase {
  type: "date";
  date: null | {
    start: string;
    end: string | null;
    time_zone: string | null;
  };
}

export interface TaskPageProperties {
  [NotionProperties.TASK]: TitleProperty;
  [NotionProperties.INBOX]: CheckboxProperty;
  [NotionProperties.KANBAN_STATE]: SelectProperty;
  [NotionProperties.PRIORITY]: SelectProperty;
  [NotionProperties.DUE]?: DateProperty;
  [NotionProperties.DONE]: CheckboxProperty;
}

export interface NotionTaskPage {
  object: "page";
  id: string;
  properties: TaskPageProperties;
}

// --- Notion API Input Types ---

export type NotionTitlePropertyInput = {
  title: { text: { content: string } }[];
};
export type NotionCheckboxPropertyInput = { checkbox: boolean };
export type NotionSelectPropertyInput = { select: { name: string } };
export type NotionDatePropertyInput = { date: { start: string } };

export type NotionPagePropertiesInput = {
  [NotionProperties.TASK]?: NotionTitlePropertyInput;
  [NotionProperties.INBOX]?: NotionCheckboxPropertyInput;
  [NotionProperties.KANBAN_STATE]?: NotionSelectPropertyInput;
  [NotionProperties.PRIORITY]?: NotionSelectPropertyInput;
  [NotionProperties.DUE]?: NotionDatePropertyInput;
  [NotionProperties.DONE]?: NotionCheckboxPropertyInput;
};
