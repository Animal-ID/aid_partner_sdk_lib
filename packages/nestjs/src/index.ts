/**
 * @animal-id/partner-nestjs — NestJS module for the Animal-ID Partner API.
 *
 * @packageDocumentation
 */

export { AnimalIdModule } from './animal-id.module.js';
export { AnimalIdService } from './animal-id.service.js';
export {
  ANIMAL_ID_OPTIONS,
  type AnimalIdModuleOptions,
  type AnimalIdModuleAsyncOptions,
  type AnimalIdOptionsFactory,
} from './interfaces.js';

export * from '@animal-id/partner-core';
