import { copy, errorMessage, type ActionError } from './copy';

/** El error de nombre repetido nombra al jugador, como en la referencia. */
export function nameErrorText(error: ActionError, name: string): string {
  return error === 'name_taken' ? copy.name.taken(name.trim()) : errorMessage(error);
}
