export type UserType = 'admin' | 'issuer' | 'recipient';

export interface User {
  id: string;
  email: string;
  fullName: string;
  password?: string;
  userType: UserType;
  certificates?: string[];
  createdAt?: string;
  updatedAt?: string;
}
