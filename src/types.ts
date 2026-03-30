export interface TimeBlock {
  id: string;
  startTime: number;
  duration: number;
  title: string;
  color?: string;
}

export interface MasterTask {
  id: string;
  text: string;
  completed: boolean;
  color?: string;
}

export interface ModalData {
  id?: string;
  title: string;
  duration: number;
  startTime: number;
}
