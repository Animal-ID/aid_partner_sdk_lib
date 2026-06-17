# @animal-id/partner-vue

Vue 3 composables for the Animal-ID Partner API.

```bash
pnpm add @animal-id/partner-vue vue
```

## Setup

```ts
import { createApp } from 'vue';
import { createAnimalId } from '@animal-id/partner-vue';
import App from './App.vue';

createApp(App)
  // Browser-safe: point baseUrl at your backend proxy or pass a custom `signer`.
  .use(createAnimalId({ baseUrl: '/api/animal-id' }))
  .mount('#app');
```

`createAnimalId(...)` also accepts a ready `AnimalIdClient`.

## Composables

**Queries** return reactive refs `{ data, error, isLoading, isSuccess, isError, refetch }`:

```ts
import { useDictionaries, useAnimalsByOwner } from '@animal-id/partner-vue';

const { data: dicts, isLoading } = useDictionaries({ lang: 'uk' });
const { data: pets, refetch } = useAnimalsByOwner('jane@example.com');
```

Pass `{ immediate: false }` to defer, or `{ watch: source }` to refetch reactively.

**Mutations** return `{ mutate, data, error, isLoading, isSuccess, isError, reset }`:

```ts
import { useCreateOwner, useCreateAnimal } from '@animal-id/partner-vue';

const { mutate: createOwner } = useCreateOwner();
await createOwner({ email: 'jane@example.com', consent: { account_creation: true } });

const { mutate: createAnimal } = useCreateAnimal();
// useUpdateAnimal → mutate({ id, input }); useCreateProcedures → mutate({ animalId, body });
// useUploadPhoto → mutate({ animalId, input }); useDeletePhoto → mutate({ animalId, photoId });
```

`useAnimalIdClient()` returns the raw client. This package also re-exports
`@animal-id/partner-core`.
