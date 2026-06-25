import { Injectable, inject } from '@angular/core';
import { from, type Observable } from 'rxjs';
import {
  AnimalIdClient,
  type AnimalAccessRequest,
  type AnimalCard,
  type CreateAnimalInput,
  type CreateOwnerInput,
  type CreateProceduresResult,
  type CreatedAnimal,
  type DictionariesParams,
  type DictionariesResult,
  type IdentifierType,
  type Owner,
  type ProcedureInput,
  type ProcedureListItem,
  type ProcedureListParams,
  type RequestOptions,
  type UpdateAnimalInput,
  type UploadPhotoInput,
  type UploadedPhoto,
} from '@animal-id/partner-core';
import { ANIMAL_ID_CONFIG } from './config.js';

/**
 * Injectable wrapper around {@link AnimalIdClient}. Every method returns a cold
 * `Observable`; use RxJS operators or `toSignal()` as you prefer. Reach the
 * underlying promise-based client via `.client` when you need it.
 *
 * Requires {@link provideAnimalId} (or `AnimalIdModule.forRoot`) in your providers.
 */
@Injectable({ providedIn: 'root' })
export class AnimalIdService {
  /** The underlying promise-based client (for advanced/async-await usage). */
  readonly client = new AnimalIdClient(inject(ANIMAL_ID_CONFIG));

  // --- Dictionaries ---
  getDictionaries(params?: DictionariesParams, opts?: RequestOptions): Observable<DictionariesResult> {
    return from(this.client.dictionaries.get(params, opts));
  }

  // --- Owners ---
  createOwner(input: CreateOwnerInput, opts?: RequestOptions): Observable<Owner> {
    return from(this.client.owners.create(input, opts));
  }

  searchOwner(emailOrPhone: string, opts?: RequestOptions): Observable<Owner | null> {
    return from(this.client.owners.search(emailOrPhone, opts));
  }

  // --- Animals ---
  createAnimal(input: CreateAnimalInput, opts?: RequestOptions): Observable<CreatedAnimal> {
    return from(this.client.animals.create(input, opts));
  }

  getAnimal(id: string, opts?: RequestOptions): Observable<AnimalCard | null> {
    return from(this.client.animals.get(id, opts));
  }

  findAnimalsByIdentifier(
    type: IdentifierType,
    value: string,
    opts?: RequestOptions,
  ): Observable<AnimalCard[]> {
    return from(this.client.animals.findByIdentifier(type, value, opts));
  }

  findAnimalsByIdentifierAny(value: string, opts?: RequestOptions): Observable<AnimalCard[]> {
    return from(this.client.animals.findByIdentifierAny(value, opts));
  }

  findAnimalsByOwner(emailOrPhone: string, opts?: RequestOptions): Observable<AnimalCard[]> {
    return from(this.client.animals.findByOwner(emailOrPhone, opts));
  }

  updateAnimal(id: string, input: UpdateAnimalInput, opts?: RequestOptions): Observable<void> {
    return from(this.client.animals.update(id, input, opts));
  }

  requestAnimalAccess(id: string, opts?: RequestOptions): Observable<AnimalAccessRequest> {
    return from(this.client.animals.requestAccess(id, opts));
  }

  animalAccessStatus(id: string, opts?: RequestOptions): Observable<AnimalAccessRequest> {
    return from(this.client.animals.accessStatus(id, opts));
  }

  // --- Procedures ---
  createProcedures(
    animalId: string,
    body: ProcedureInput | ProcedureInput[],
    opts?: RequestOptions,
  ): Observable<CreateProceduresResult> {
    return from(this.client.procedures.create(animalId, body, opts));
  }

  listProcedures(
    animalId: string,
    params?: ProcedureListParams,
    opts?: RequestOptions,
  ): Observable<ProcedureListItem[]> {
    return from(this.client.procedures.list(animalId, params, opts));
  }

  getProcedure(procedureId: number | string, opts?: RequestOptions): Observable<ProcedureListItem | null> {
    return from(this.client.procedures.get(procedureId, opts));
  }

  // --- Photos ---
  uploadPhoto(animalId: string, input: UploadPhotoInput, opts?: RequestOptions): Observable<UploadedPhoto> {
    return from(this.client.photos.upload(animalId, input, opts));
  }

  deletePhoto(animalId: string, photoId: number | string, opts?: RequestOptions): Observable<void> {
    return from(this.client.photos.delete(animalId, photoId, opts));
  }
}
