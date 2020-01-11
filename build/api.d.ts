import { User, Token } from './types';
export declare type Options = {
    port: number;
    logging?: boolean;
    auth?: AuthConfig;
};
export declare type AuthConfig = {
    secret: string;
    expiryMins?: number;
    getToken(token: string): Promise<Token | null>;
    createToken(userId: string): Promise<Token>;
    getUser(userId: string): Promise<User | null>;
    saveUser(userId: string, password: string): Promise<void>;
};
export declare function create(opts?: Options): {
    app: import("express-serve-static-core").Express;
    start: () => Promise<void>;
};
