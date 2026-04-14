export type Conversation = {
    role: "system" | "user" | "assistant";
    content: string;
};

export type FunctionInvocationRequest<Auto extends object = Record<string, (...args: any) => any>> = {
    [K in keyof Auto]: Auto[K] extends (...args: any) => any
    ? {
        function: K;
        intention: string;
        arguments: Parameters<Auto[K]>;
    }
    : never;
}[keyof Auto];


export const ACTION_TYPE = "action";
export const SIMPLIFICATION_TYPE = "simplification";

export type PromptType = typeof ACTION_TYPE | typeof SIMPLIFICATION_TYPE;
