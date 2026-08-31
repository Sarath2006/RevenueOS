/**
 * ============================================================
 * RevenueOS — M6.13 AI SAFETY SERVICE
 * ============================================================
 */

import {
  validateAISafety,
} from "./safety.validator";

import type {
  AISafetyContext,
} from "./safety.types";


export class AISafetyService {

  evaluate(
    context: AISafetyContext,
  ) {

    return validateAISafety(
      context,
    );
  }
}


export const aiSafetyService =
  new AISafetyService();