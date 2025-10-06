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
const zod_1 = require("zod");
const schemas_1 = require("../types/schemas");
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
            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.baseDir, filePath);
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
        try {
            schemas_1.WorkflowDefinitionSchema.parse(workflow);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const errorMessages = error.errors
                    .map((e) => `(${e.path.join(".")}) ${e.message}`)
                    .join("; ");
                throw new Error(`Workflow validation failed: ${errorMessages}`);
            }
            throw error;
        }
    }
    async saveToFile(workflow, filePath) {
        try {
            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.baseDir, filePath);
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
