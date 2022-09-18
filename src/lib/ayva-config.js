import { Ayva } from 'ayvajs';

export const ayvaConfig = Ayva.defaultConfiguration;

/**
 * Create a new Ayva instance with the global app configuration.
 *
 * @returns a new Ayva instance.
 */
export function createAyva () {
  return new Ayva(ayvaConfig);
}
