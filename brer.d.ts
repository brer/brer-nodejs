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
 * Declare a Brer's function.
 * The returned `Promise` will never reject.
 */
export default function brer(handler: BrerHandler): void;
