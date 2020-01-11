import { NextFunction, Response } from 'express';
import * as bunyan from 'bunyan';
export declare type Logger = bunyan;
export declare const logger: bunyan;
export declare function logMiddleware(req: any, res: Response, next: NextFunction): void;
export declare function createLogger(name: string): bunyan;
