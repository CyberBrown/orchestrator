import { WorkflowDefinition } from "../types/schemas";
export interface WorkflowLoaderOptions {
    baseDir?: string;
    validate?: boolean;
    env?: Record<string, string>;
}
export declare class WorkflowLoader {
    private baseDir;
    private validate;
    private env;
    constructor(options?: WorkflowLoaderOptions);
    loadFromFile(filePath: string): Promise<WorkflowDefinition>;
    loadFromString(json: string): WorkflowDefinition;
    loadFromObject(obj: unknown): WorkflowDefinition;
    private substituteEnvVars;
    private validateWorkflow;
    saveToFile(workflow: WorkflowDefinition, filePath: string): Promise<void>;
}
export declare function loadWorkflow(filePath: string, options?: WorkflowLoaderOptions): Promise<WorkflowDefinition>;
//# sourceMappingURL=WorkflowLoader.d.ts.map