declare namespace Express {
  export interface Request {
    admin: {
      _id: string;
    };
    access_token: string | null;
  }
}
