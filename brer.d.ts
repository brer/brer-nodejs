/// <reference types="node" />

/**
 * Function handler for this project.
 */
export type Handler = (payload: Buffer, context: Context) => any;

export interface Context {
  /**
   * Payload's content type.
   */
  contentType: string;
  /**
   * The Invoication's identifier that was created by the Function.
   */
  invocation: Invocation;
}

export interface Invocation {
  /**
   * Invocation identifier.
   */
  _id: string;
  /**
   * Name of the invoking function.
   */
  functionName: string;
  /**
   * TODO: other fields
   */
  [key: string]: any;
}

/**
 * Just like `Promise.allSettled` output.
 */
export interface Result {
  /**
   * Promise result status.
   */
  status: "fulfilled" | "rejected";
  /**
   * Fulfillment value.
   */
  reason: any;
  /**
   * Reason of rejection.
   */
  value: any;
}

/**
 * Declare a Brer's function.
 * The returned `Promise` will never reject.
 */
export default function brer(handler: Handler): Promise<Result>;
