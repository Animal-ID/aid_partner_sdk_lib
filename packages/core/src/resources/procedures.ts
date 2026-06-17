import { unwrapMany, unwrapOne } from '../envelope.js';
import { AnimalIdApiError } from '../errors.js';
import type {
  CreateProceduresResult,
  ProcedureInput,
  ProcedureListItem,
  ProcedureListParams,
  RequestOptions,
} from '../types.js';
import type { Transport } from '../transport.js';

/** Veterinary procedures recorded against an animal (vaccinations, identification, …). */
export class ProceduresResource {
  constructor(private readonly transport: Transport) {}

  /**
   * `POST /v1/partner/animals/{id}/procedures` — record one procedure or a batch (≤100).
   * Vet/organization key; grants the vet a relation to the animal.
   */
  async create(
    animalId: string,
    body: ProcedureInput | ProcedureInput[],
    opts?: RequestOptions,
  ): Promise<CreateProceduresResult> {
    const result = await this.transport.request(
      {
        method: 'POST',
        path: `/animals/${encodeURIComponent(animalId)}/procedures`,
        json: body,
        idempotent: true,
      },
      opts,
    );
    return unwrapOne<CreateProceduresResult>(result.data);
  }

  /** `GET /v1/partner/animals/{id}/procedures` — history, optionally filtered. */
  async list(
    animalId: string,
    params: ProcedureListParams = {},
    opts?: RequestOptions,
  ): Promise<ProcedureListItem[]> {
    const result = await this.transport.request(
      {
        method: 'GET',
        path: `/animals/${encodeURIComponent(animalId)}/procedures`,
        query: { type: params.type, since: params.since, until: params.until },
      },
      opts,
    );
    return unwrapMany<ProcedureListItem>(result.data);
  }

  /** `GET /v1/partner/procedures/{id}` — single procedure, or `null` if not found. */
  async get(procedureId: number | string, opts?: RequestOptions): Promise<ProcedureListItem | null> {
    try {
      const result = await this.transport.request(
        { method: 'GET', path: `/procedures/${encodeURIComponent(String(procedureId))}` },
        opts,
      );
      return unwrapOne<ProcedureListItem>(result.data);
    } catch (err) {
      if (err instanceof AnimalIdApiError && err.status === 404) return null;
      throw err;
    }
  }
}
