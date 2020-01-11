/// <reference types="express" />
import { AuthConfig } from './api';
export declare function createAuth(config: AuthConfig): {
    handler: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary>;
    middleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary>;
};
