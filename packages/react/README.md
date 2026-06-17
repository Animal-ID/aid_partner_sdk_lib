# @animal-id/partner-react

React 18+ bindings for the Animal-ID Partner API. Works in plain React and Next.js
(App or Pages Router — provider in a Client Component).

```bash
pnpm add @animal-id/partner-react react
```

## Setup

```tsx
import { AnimalIdProvider } from '@animal-id/partner-react';

// Browser-safe config: point baseUrl at your backend proxy, or pass a custom `signer`.
// Never embed the private key in the browser.
export function Providers({ children }: { children: React.ReactNode }) {
  return <AnimalIdProvider config={{ baseUrl: '/api/animal-id' }}>{children}</AnimalIdProvider>;
}
```

You can also pass a ready `client={...}` instead of `config`.

## Hooks

**Queries** (auto-fetch, return `{ data, error, isLoading, isSuccess, isError, refetch }`):

```tsx
const dicts = useDictionaries({ lang: 'uk' });
const animal = useAnimal(id);                       // skips while id is undefined
const pets = useAnimalsByOwner('jane@example.com');
const byChip = useAnimalsByIdentifier('microchip', value);
const history = useProcedures(animalId, { type: 10 });
```

**Mutations** (return `{ mutate, data, error, isLoading, isSuccess, isError, reset }`):

```tsx
const { mutate: createOwner, isLoading } = useCreateOwner();
await createOwner({ email: 'jane@example.com', consent: { account_creation: true } });

const { mutate: createAnimal } = useCreateAnimal();
const { mutate: updateAnimal } = useUpdateAnimal();   // mutate({ id, input })
const { mutate: addProcedures } = useCreateProcedures(); // mutate({ animalId, body })
const { mutate: uploadPhoto } = useUploadPhoto();     // mutate({ animalId, input: { file } })
const { mutate: deletePhoto } = useDeletePhoto();     // mutate({ animalId, photoId })
const { mutate: searchOwner } = useSearchOwner();
```

`useAnimalIdClient()` returns the underlying `AnimalIdClient` for ad-hoc calls.

The generic `useQuery`/`useMutation` are exported too. They are intentionally
cache-free — drop in TanStack Query if you want caching/dedup; the client methods
compose with it directly.

> This package re-exports everything from `@animal-id/partner-core`, so you can
> import types and the client from a single place.
