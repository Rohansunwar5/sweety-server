declare namespace Express {
  export interface Request {
    user: {
      _id: string,
    },
    access_token: string | null,
  }
}