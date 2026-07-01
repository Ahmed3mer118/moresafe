import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const PREFIX = 'erp:draft:';

function storageKey(key: string, userId?: string) {
  return `${PREFIX}${userId || 'guest'}:${key}`;
}

export function loadFormDraft<T>(key: string, userId?: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey(key, userId));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveFormDraft<T>(key: string, value: T, userId?: string) {
  try {
    localStorage.setItem(storageKey(key, userId), JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function clearFormDraft(key: string, userId?: string) {
  localStorage.removeItem(storageKey(key, userId));
}

export function hasFormDraft(key: string, userId?: string) {
  return localStorage.getItem(storageKey(key, userId)) !== null;
}

type SetFormAction<T> = T | ((prev: T) => T);

interface UseFormDraftOptions<T> {
  persist?: boolean;
  omit?: (keyof T)[];
}

function stripFields<T extends object>(value: T, omit?: (keyof T)[]): T {
  if (!omit?.length) return value;
  const next = { ...value };
  for (const k of omit) delete next[k];
  return next;
}

function resolveDraft<T extends object>(
  key: string,
  userId: string | undefined,
  initial: T,
  omit?: (keyof T)[]
): T {
  const draft = loadFormDraft<T>(key, userId);
  if (!draft) return initial;
  if (omit?.length) return { ...initial, ...draft };
  return draft;
}

export function useFormDraft<T extends object>(
  key: string,
  initial: T,
  options: UseFormDraftOptions<T> = {}
) {
  const { persist = true, omit } = options;
  const { user } = useAuth();
  const userId = user?.id;

  const initialRef = useRef(initial);
  initialRef.current = initial;

  const omitRef = useRef(omit);
  omitRef.current = omit;

  const persistRef = useRef(persist);
  persistRef.current = persist;

  const [form, setFormState] = useState<T>(() =>
    persist ? resolveDraft(key, userId, initial, omit) : initial
  );

  const storageContextRef = useRef({ key, userId, persist });
  const skipSaveRef = useRef(true);

  // Reload only when storage identity changes (route/form key, user, persist flag)
  useEffect(() => {
    const ctx = { key, userId, persist };
    const prev = storageContextRef.current;
    const contextChanged =
      prev.key !== ctx.key || prev.userId !== ctx.userId || prev.persist !== ctx.persist;

    storageContextRef.current = ctx;
    skipSaveRef.current = true;

    if (!persist) {
      setFormState(initialRef.current);
    } else if (contextChanged) {
      setFormState(resolveDraft(key, userId, initialRef.current, omitRef.current));
    }

    const timer = window.setTimeout(() => {
      skipSaveRef.current = false;
    }, 0);

    return () => window.clearTimeout(timer);
  }, [key, userId, persist]);

  const persistForm = useCallback(
    (value: T) => {
      if (!persistRef.current) return;
      saveFormDraft(key, stripFields(value, omitRef.current), userId);
    },
    [key, userId]
  );

  const setForm = useCallback(
    (value: SetFormAction<T>) => {
      setFormState((prev) => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
        if (!skipSaveRef.current) persistForm(next);
        return next;
      });
    },
    [persistForm]
  );

  const resetForm = useCallback(
    (next?: T) => {
      const val = next ?? initialRef.current;
      setFormState(val);
      if (persistRef.current) persistForm(val);
      else clearFormDraft(key, userId);
    },
    [key, userId, persistForm]
  );

  const clearDraft = useCallback(() => {
    clearFormDraft(key, userId);
    skipSaveRef.current = true;
    setFormState(initialRef.current);
    window.setTimeout(() => {
      skipSaveRef.current = false;
    }, 0);
  }, [key, userId]);

  return {
    form,
    setForm,
    resetForm,
    clearDraft,
    hasDraft: hasFormDraft(key, userId),
  };
}

export function useFieldDraft(key: string, initial = '') {
  const { user } = useAuth();
  const userId = user?.id;

  const [value, setValueState] = useState(() => loadFormDraft<string>(key, userId) ?? initial);

  const storageContextRef = useRef({ key, userId });
  const skipSaveRef = useRef(true);

  useEffect(() => {
    const contextChanged =
      storageContextRef.current.key !== key || storageContextRef.current.userId !== userId;

    storageContextRef.current = { key, userId };
    skipSaveRef.current = true;

    if (contextChanged) {
      setValueState(loadFormDraft<string>(key, userId) ?? initial);
    }

    const timer = window.setTimeout(() => {
      skipSaveRef.current = false;
    }, 0);

    return () => window.clearTimeout(timer);
  }, [key, userId, initial]);

  const setValue = useCallback(
    (v: string) => {
      setValueState(v);
      if (!skipSaveRef.current) saveFormDraft(key, v, userId);
    },
    [key, userId]
  );

  const clearDraft = useCallback(() => {
    clearFormDraft(key, userId);
    skipSaveRef.current = true;
    setValueState(initial);
    window.setTimeout(() => {
      skipSaveRef.current = false;
    }, 0);
  }, [key, userId, initial]);

  return { value, setValue, clearDraft };
}
