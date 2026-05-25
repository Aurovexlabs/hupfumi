import api from "@/lib/api";
import { storage } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

export type ListingNoteType = "job" | "product" | "service";

const LISTING_NOTES_PREFIX = "hupfumi-listing-notes";
const NOTE_SYNC_DEBOUNCE_MS = 900;

let listingNotesHydrationPromise: Promise<void> | null = null;
const listingNoteTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getAuthContext(): { isAuthenticated: boolean; userId: string | null } {
  const auth = useAuthStore.getState();
  return {
    isAuthenticated: Boolean(auth.isAuthenticated),
    userId: auth.user?._id ? String(auth.user._id) : null,
  };
}

function getListingNoteStorageKey(
  type: ListingNoteType,
  listingId: string,
): string {
  return `${LISTING_NOTES_PREFIX}:${type}:${listingId}`;
}

function clearLocalListingNotesCache(): void {
  if (typeof window === "undefined") return;

  const keysToRemove: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(`${LISTING_NOTES_PREFIX}:`)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.remove(key));
}

function queueListingNoteCloudSync(
  type: ListingNoteType,
  listingId: string,
  note: string,
): void {
  if (typeof window === "undefined") return;

  const { isAuthenticated, userId } = getAuthContext();
  if (!isAuthenticated || !userId || !listingId) return;

  const timerKey = `${userId}:${type}:${listingId}`;
  const currentTimer = listingNoteTimers.get(timerKey);
  if (currentTimer) {
    window.clearTimeout(currentTimer);
  }

  const nextTimer = window.setTimeout(async () => {
    try {
      await api.put("/users/me/workspace/listing-note", {
        type,
        listingId,
        note,
      });
    } catch {
      // Keep local note when cloud sync fails.
    } finally {
      listingNoteTimers.delete(timerKey);
    }
  }, NOTE_SYNC_DEBOUNCE_MS);

  listingNoteTimers.set(timerKey, nextTimer);
}

export async function hydrateListingNotesFromCloud(): Promise<void> {
  if (typeof window === "undefined") return;

  const { isAuthenticated, userId } = getAuthContext();
  if (!isAuthenticated || !userId) return;

  if (listingNotesHydrationPromise) return listingNotesHydrationPromise;

  listingNotesHydrationPromise = (async () => {
    try {
      const response = await api.get("/users/me/workspace");
      const notes = response?.data?.data?.listingNotes;

      if (Array.isArray(notes)) {
        clearLocalListingNotesCache();

        notes.forEach((rawNote: any) => {
          const type = String(rawNote?.type ?? "")
            .trim()
            .toLowerCase();
          const listingId = String(rawNote?.listingId ?? "").trim();
          const note =
            typeof rawNote?.note === "string"
              ? rawNote.note
              : String(rawNote?.note ?? "");

          if (
            !listingId ||
            (type !== "job" && type !== "product" && type !== "service")
          ) {
            return;
          }

          const storageKey = getListingNoteStorageKey(
            type as ListingNoteType,
            listingId,
          );

          if (note.trim()) {
            storage.set(storageKey, note);
          } else {
            storage.remove(storageKey);
          }
        });
      }
    } catch {
      // Fail silently and continue using local notes.
    } finally {
      listingNotesHydrationPromise = null;
    }
  })();

  return listingNotesHydrationPromise;
}

export function getListingNote(
  type: ListingNoteType,
  listingId: string,
): string {
  if (!listingId) return "";
  return storage.get<string>(getListingNoteStorageKey(type, listingId), "");
}

export function saveListingNote(
  type: ListingNoteType,
  listingId: string,
  note: string,
): void {
  if (!listingId) return;

  if (!note.trim()) {
    storage.remove(getListingNoteStorageKey(type, listingId));
    queueListingNoteCloudSync(type, listingId, "");
    return;
  }

  storage.set(getListingNoteStorageKey(type, listingId), note);
  queueListingNoteCloudSync(type, listingId, note);
}
