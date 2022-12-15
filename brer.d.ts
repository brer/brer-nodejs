/// <reference types="node" />

/**
 * Function handler for this project.
 */
export type Handler<T> = (payload: Buffer, context: Context) => T;

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
 * Declare a Brer's function.
 * The returned `Promise` will never reject.
 */
export default function brer<T>(handler: Handler<T>): Promise<Awaited<T>>;
