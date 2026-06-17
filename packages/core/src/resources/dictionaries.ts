import type { ApiEnvelope, DictionariesParams, DictionariesResult, DictionaryGroup, RequestOptions } from '../types.js';
import type { Transport } from '../transport.js';

/** Reference data (species, sex, sizes, countries, languages, …). Public, CDN-cacheable. */
export class DictionariesResource {
  constructor(private readonly transport: Transport) {}

  /**
   * `GET /v1/partner/dictionaries` — no signature required.
   *
   * Pass `ifNoneMatch` (a previously received etag) to leverage conditional GET:
   * a 304 returns `{ notModified: true }` with an empty payload.
   */
  async get(params: DictionariesParams = {}, opts?: RequestOptions): Promise<DictionariesResult> {
    const result = await this.transport.request<ApiEnvelope<DictionaryGroup[]>>(
      {
        method: 'GET',
        path: '/dictionaries',
        query: {
          include: params.include?.length ? params.include.join(',') : undefined,
          q: params.q,
          lang: params.lang,
        },
        signed: false,
        ifNoneMatch: params.ifNoneMatch,
      },
      opts,
    );

    if (result.status === 304) {
      return { payload: [], metadata: null, etag: result.etag ?? params.ifNoneMatch, notModified: true };
    }

    const metadata = result.data?.metadata as DictionariesResult['metadata'];
    return {
      payload: result.data?.payload ?? [],
      metadata,
      etag: result.etag ?? metadata?.etag,
      notModified: false,
    };
  }
}
