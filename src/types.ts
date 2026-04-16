export type Conversation = {
    role: "system" | "user" | "assistant";
    content: string;
};

export type Prettify<T extends object> = {
    [K in keyof T]: T[K]
} & {}

export type FunctionInvocationRef<Auto extends object = Record<string, (...args: any) => any>> = {
    [K in keyof Auto]: Auto[K] extends ((...args: infer P) => any)
    ? {
        function: K;
        intention: string;
        arguments: P;
    }
    : never;
}

export type FunctionInvocationRequest<Auto extends object = Record<string, (...args: any) => any>> = Prettify<FunctionInvocationRef<Auto>[keyof Auto]>;

export const ACTION_TYPE = "action";
export const SIMPLIFICATION_TYPE = "simplification";

export type PromptType = typeof ACTION_TYPE | typeof SIMPLIFICATION_TYPE;
