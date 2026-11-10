
"use client";

import { useEffect, useState } from "react";

import RequireAuth from "../../components/RequireAuth";
import ZimmerCanvas from "../../components/ZimmerCanvas";
import NavigationOrb from "../../components/NavigationOrb";

import {
  zimmerApi,
  ZimmerApiError,
  type ZimmerDocument,
} from "../../lib/api/zimmerApi";

import { createDefaultZimmer } from "../../lib/zimmerTypes";

export default function ZimmerPage() {
  const [zimmer, setZimmer] = useState<ZimmerDocument | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadZimmer() {
      try {
        let document: ZimmerDocument;

        try {
          // Load the user's existing room.
          document = await zimmerApi.getMine();
        } catch (err) {
          if (
            !(err instanceof ZimmerApiError) ||
            err.status !== 404
          ) {
            throw err;
          }

          // A 404 means this user has no room yet.
          // Create a clean room at revision 1.
          try {
            document = await zimmerApi.save(
              createDefaultZimmer(),
              null
            );
          } catch (createError) {
            if (
              createError instanceof ZimmerApiError &&
              createError.status === 409
            ) {
              // Another request may have created the room.
              // Fetch the existing version instead.
              document = await zimmerApi.getMine();
            } else {
              throw createError;
            }
          }
        }

        if (!cancelled) {
          setZimmer(document);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your Zimmer."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadZimmer();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <RequireAuth>
      <main className="relative min-h-screen bg-[#080817]">
        {loading ? (
          <div className="flex min-h-screen items-center justify-center text-purple-100">
            Creating your space...
          </div>
        ) : error ? (
          <div className="flex min-h-screen items-center justify-center px-6 text-center text-red-300">
            {error}
          </div>
        ) : zimmer ? (
          <ZimmerCanvas
            key={zimmer.id}
            initialRoom={zimmer}
          />
        ) : null}

        <NavigationOrb />
      </main>
    </RequireAuth>
  );
}
