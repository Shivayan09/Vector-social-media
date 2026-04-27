"use client";
import { useState, useCallback } from "react";

export const useLoading = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);

  const startLoading = useCallback(() => {
    setLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setLoading(false);
  }, []);

  const withLoading = useCallback(
    async <T,>(asyncFn: () => Promise<T>): Promise<T | null> => {
      try {
        setLoading(true);
        const result = await asyncFn();
        return result;
      } catch (err) {
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, startLoading, stopLoading, withLoading };
};
