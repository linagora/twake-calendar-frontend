export interface ResourceData {
  _id: string;
  name: string;
  description: string;
  type: string;
  icon: string;
  deleted: boolean;
  creator: string;
  administrators: {
    _id: string;
    id: string;
    objectType: string;
  }[];
  timestamps: {
    creation: string;
    updatedAt: string;
  };
  resource?: boolean;
}
