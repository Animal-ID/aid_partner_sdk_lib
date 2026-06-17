import { unwrapOne } from '../envelope.js';
import type { PhotoFileInput, PhotoInput, RequestOptions, UploadPhotoInput, UploadedPhoto } from '../types.js';
import type { Transport } from '../transport.js';

/** Animal photos (avatar / gallery / nose print). Uploaded as multipart/form-data. */
export class PhotosResource {
  constructor(private readonly transport: Transport) {}

  /**
   * `POST /v1/partner/animals/{id}/photos` — upload one image (≤ 8 MB).
   * Accepts a `Blob`/`File`, or `{ data, filename, contentType }` for raw bytes.
   */
  async upload(
    animalId: string,
    input: UploadPhotoInput,
    opts?: RequestOptions,
  ): Promise<UploadedPhoto> {
    const form = new FormData();
    const { blob, filename } = toBlob(input.file);
    form.append('file', blob, filename);
    if (input.kind) form.append('kind', input.kind);

    const result = await this.transport.request(
      {
        method: 'POST',
        path: `/animals/${encodeURIComponent(animalId)}/photos`,
        form,
        idempotent: true,
      },
      opts,
    );
    return unwrapOne<UploadedPhoto>(result.data);
  }

  /** `DELETE /v1/partner/animals/{id}/photos/{photoId}` — soft-delete a photo. */
  async delete(
    animalId: string,
    photoId: number | string,
    opts?: RequestOptions,
  ): Promise<void> {
    await this.transport.request(
      {
        method: 'DELETE',
        path: `/animals/${encodeURIComponent(animalId)}/photos/${encodeURIComponent(String(photoId))}`,
        idempotent: true,
      },
      opts,
    );
  }
}

function toBlob(file: PhotoInput): { blob: Blob; filename: string } {
  if (typeof Blob !== 'undefined' && file instanceof Blob) {
    const name = (file as File).name || 'upload';
    return { blob: file, filename: name };
  }
  const descriptor = file as PhotoFileInput;
  const blob = new Blob([descriptor.data as BlobPart], {
    type: descriptor.contentType ?? 'application/octet-stream',
  });
  return { blob, filename: descriptor.filename ?? 'upload' };
}
