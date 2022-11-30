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
   * The triggered Function's name.
   */
  functionName: string;
  /**
   * The Invoication's identifier that was created by the Function.
   */
  invocationId: string;
}

/**
 * Declare a Brer's function.
 *
 * @param handler The Function's handler.
 * @param callback Optional callback when the Function ends.
 */
export default function brer(
  handler: Handler,
  callback?: (err: any, result: any) => void
): void;
