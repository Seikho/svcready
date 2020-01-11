import * as express from 'express';
import { Handler } from './types';
export declare function handle(handler: Handler): express.RequestHandler<import("express-serve-static-core").ParamsDictionary>;
