import { signal } from '@angular/core';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface FakeResponse<T = unknown> {
  data?: T | null;
  error?: { message: string } | null;
}

export type FakeResolver = (
  table: string,
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert',
  payload: unknown,
  filters: { column: string; value: unknown; op?: 'eq' | 'is' }[],
) => FakeResponse;

/**
 * Crea un SupabaseClient de mentira para tests unitarios. El resolver decide qué
 * devolver en cada llamada según tabla, operación, payload y filtros acumulados.
 */
export function createFakeSupabaseClient(
  resolver: FakeResolver,
  user?: Partial<User>,
): SupabaseClient {
  const authUser = user ?? { id: 'coach-uuid', email: 'coach@example.com' };

  function createTable(table: string): any {
    const filters: { column: string; value: unknown; op?: 'eq' | 'is' }[] = [];
    let operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
    let operationLocked = false;
    let payload: unknown = null;

    const builder: any = {
      select: () => {
        if (!operationLocked) {
          operation = 'select';
        }
        return builder;
      },
      insert: (data: unknown) => {
        operation = 'insert';
        operationLocked = true;
        payload = data;
        return builder;
      },
      update: (data: unknown) => {
        operation = 'update';
        operationLocked = true;
        payload = data;
        return builder;
      },
      upsert: (data: unknown, _options?: unknown) => {
        operation = 'upsert';
        operationLocked = true;
        payload = data;
        return builder;
      },
      delete: () => {
        operation = 'delete';
        operationLocked = true;
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push({ column, value, op: 'eq' });
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters.push({ column, value, op: 'is' });
        return builder;
      },
      gte: () => builder,
      lte: () => builder,
      order: () => builder,
      returns: async <T>() => resolver(table, operation, payload, filters) as FakeResponse<T>,
      single: async <T>() => resolver(table, operation, payload, filters) as FakeResponse<T>,
      maybeSingle: async <T>() => resolver(table, operation, payload, filters) as FakeResponse<T>,
      then: (onFulfilled?: (value: FakeResponse) => unknown, onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve(resolver(table, operation, payload, filters)).then(onFulfilled, onRejected),
    };

    return builder;
  }

  return {
    from: createTable,
    auth: {
      getUser: async () => ({ data: { user: authUser as User }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    functions: {
      invoke: async () => ({ data: null, error: null }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
  } as unknown as SupabaseClient;
}

export function fakeSupabaseService(resolver: FakeResolver, userId = 'coach-uuid') {
  return {
    client: createFakeSupabaseClient(resolver, { id: userId }),
    user: signal<User | null>({ id: userId, email: 'coach@example.com' } as User),
    initialized: signal(true),
    initialize: async () => {},
    loadProfile: async () => {},
  };
}
