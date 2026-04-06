export interface LinkItem {
  id: string;
  label: string;
  target: string;
  type: 'url' | 'file';
}

export interface TimeBlock {
  id: string;
  startTime: number;
  duration: number;
  title: string;
  color?: string;
  memo?: string;
  links?: LinkItem[];
}

export interface MasterTask {
  id: string;
  text: string;
  completed: boolean;
  color?: string;
  memo?: string;
  links?: LinkItem[];
}

export interface ModalData {
  id?: string;
  title: string;
  duration: number;
  startTime: number;
}
