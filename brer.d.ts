/// <reference types="node" />

/**
 * Function handler for this project.
 */
export type BrerHandler = (payload: Buffer, context: BrerContext) => any;

export interface BrerContext {
  /**
   * Payload's content type.
   */
  contentType: string;
  /**
   * The Invoication's identifier that was created by the Function.
   */
  invocation: BrerInvocation;
}

export interface BrerInvocation {
  /**
   * Invocation identifier.
   */
  _id: string;
  /**
   * Name of the invoking function.
   */
  functionName: string;
  /**
   * Configured env variables.
   */
  env: {
    name: string;
    value?: string;
    secretName?: string;
    secretKey?: string;
  }[];
  /**
   * TODO: other fields
   */
  [key: string]: any;
}

/**
 * Keys are Functions' name.
 * Key `_` is the fallback.
 */
export type BrerHandlers = Record<string, BrerHandler>;

/**
 * Register multiple handlers at the same time.
 */
export function register(handlers: BrerHandlers): void;
/**
 * Register one global handler for all functions.
 */
export function register(handler: BrerHandler): void;
/**
 * Register one named handler for a single function.
 */
export function register(fnName: string, fnHandler: BrerHandler): void;

/**
 * Register optionally a set of named handlers or a global handler and then execute Brer runtime.
 * Returns `true` when a Brer environment is detected and the execution was started.
 * Returns `false` when is not possible to run any function. Can be use to add more "modes" to the project.
 */
export default function brer(handler?: BrerHandler | BrerHandlers): boolean;
