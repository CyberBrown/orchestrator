"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowLoader = void 0;
exports.loadWorkflow = loadWorkflow;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class WorkflowLoader {
    constructor(options = {}) {
        this.baseDir = options.baseDir ?? process.cwd();
        this.validate = options.validate ?? true;
        this.env = options.env ?? process.env;
    }
    async loadFromFile(filePath) {
        try {
            const fullPath = path.isAbsolute(filePath)
                ? filePath
                : path.join(this.baseDir, filePath);
            const content = await fs.promises.readFile(fullPath, "utf-8");
            const json = JSON.parse(content);
            const substituted = this.substituteEnvVars(json);
            if (this.validate) {
                this.validateWorkflow(substituted);
            }
            return substituted;
        }
        catch (error) {
            throw new Error(`Failed to load workflow from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    loadFromString(json) {
        try {
            const parsed = JSON.parse(json);
            const substituted = this.substituteEnvVars(parsed);
            if (this.validate) {
                this.validateWorkflow(substituted);
            }
            return substituted;
        }
        catch (error) {
            throw new Error(`Failed to parse workflow JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    loadFromObject(obj) {
        const substituted = this.substituteEnvVars(obj);
        if (this.validate) {
            this.validateWorkflow(substituted);
        }
        return substituted;
    }
    substituteEnvVars(obj) {
        if (typeof obj === "string") {
            return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => {
                return this.env[varName] ?? "";
            });
        }
        if (Array.isArray(obj)) {
            return obj.map((item) => this.substituteEnvVars(item));
        }
        if (obj && typeof obj === "object") {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = this.substituteEnvVars(value);
            }
            return result;
        }
        return obj;
    }
    validateWorkflow(workflow) {
        if (!workflow || typeof workflow !== "object") {
            throw new Error("Workflow must be an object");
        }
        const w = workflow;
        if (!w.id || typeof w.id !== "string") {
            throw new Error('Workflow must have an "id" field');
        }
        if (!w.name || typeof w.name !== "string") {
            throw new Error('Workflow must have a "name" field');
        }
        if (!Array.isArray(w.steps) || w.steps.length === 0) {
            throw new Error("Workflow must have at least one step");
        }
        const stepIds = new Set();
        for (const step of w.steps) {
            this.validateStep(step, stepIds);
            stepIds.add(step.stepId);
        }
        for (const step of w.steps) {
            const s = step;
            if (s.dependencies) {
                for (const depId of s.dependencies) {
                    if (!stepIds.has(depId)) {
                        throw new Error(`Step ${s.stepId} depends on non-existent step: ${depId}`);
                    }
                }
            }
        }
        if (w.errorHandler && typeof w.errorHandler !== "string") {
            throw new Error("errorHandler must be a string");
        }
        if (w.successHandler && typeof w.successHandler !== "string") {
            throw new Error("successHandler must be a string");
        }
        if (w.deadLetterHandler && typeof w.deadLetterHandler !== "string") {
            throw new Error("deadLetterHandler must be a string");
        }
    }
    validateStep(step, existingStepIds) {
        if (!step || typeof step !== "object") {
            throw new Error("Step must be an object");
        }
        const s = step;
        if (!s.stepId || typeof s.stepId !== "string") {
            throw new Error('Step must have a "stepId" field');
        }
        if (existingStepIds.has(s.stepId)) {
            throw new Error(`Duplicate step ID: ${s.stepId}`);
        }
        if (!s.actionName || typeof s.actionName !== "string") {
            throw new Error(`Step ${s.stepId} must have an "actionName" field`);
        }
        if (s.dependencies && !Array.isArray(s.dependencies)) {
            throw new Error(`Step ${s.stepId} dependencies must be an array`);
        }
        if (s.maxRetries !== undefined) {
            if (typeof s.maxRetries !== "number" || s.maxRetries < 0) {
                throw new Error(`Step ${s.stepId} maxRetries must be a non-negative number`);
            }
        }
        if (s.timeout !== undefined) {
            if (typeof s.timeout !== "number" || s.timeout < 1000) {
                throw new Error(`Step ${s.stepId} timeout must be at least 1000ms`);
            }
        }
    }
    async saveToFile(workflow, filePath) {
        try {
            const fullPath = path.isAbsolute(filePath)
                ? filePath
                : path.join(this.baseDir, filePath);
            const json = JSON.stringify(workflow, null, 2);
            await fs.promises.writeFile(fullPath, json, "utf-8");
        }
        catch (error) {
            throw new Error(`Failed to save workflow to ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.WorkflowLoader = WorkflowLoader;
async function loadWorkflow(filePath, options) {
    const loader = new WorkflowLoader(options);
    return loader.loadFromFile(filePath);
}
