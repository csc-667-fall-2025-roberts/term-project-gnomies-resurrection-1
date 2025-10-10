import { NextFunction, Request, Response } from "express";

const requestTimestampMiddleware = (
  request: Request,
  _response: Response,
  next: NextFunction,
) => {
  console.log(
    `Request received for ${request.url} at ${Date.now().toLocaleString()}`,
  );
  next();
};

export default requestTimestampMiddleware;
