export interface FirestoreDoc {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum LoadingState {
  Idle = 'idle',
  Loading = 'loading',
  Loaded = 'loaded',
  Error = 'error',
}
