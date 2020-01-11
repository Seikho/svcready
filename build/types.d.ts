import * as Logger from 'bunyan';
import * as express from 'express';
export declare class StatusError extends Error {
    msg: string;
    status: number;
    constructor(msg: string, status: number);
}
export declare type User = {
    userId: string;
    hash: string;
};
export declare type Token = {
    userId: string;
    expires: Date;
};
export interface Request extends express.Request {
    log: Logger;
    user?: {
        userId: string;
    };
}
export declare type Handler = (req: Request, res: express.Response, next: express.NextFunction) => Promise<void> | void;
