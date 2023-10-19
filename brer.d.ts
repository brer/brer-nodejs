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
export type BrerHandlers = Record<string, BrerHandler>

/**
 * Configure Brer function(s) handler.
 */
export default function brer(handler: BrerHandler | BrerHandlers): void;
