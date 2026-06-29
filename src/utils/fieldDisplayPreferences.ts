export const FIELD_DISPLAY_PREFERENCES_STORAGE_KEY = "json-compare-field-display-preferences";

export type FieldDisplayPreferences = {
  showLeafFieldOnly: boolean;
};

const DEFAULT_FIELD_DISPLAY_PREFERENCES: FieldDisplayPreferences = {
  showLeafFieldOnly: true,
};

export function readFieldDisplayPreferences(): FieldDisplayPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_FIELD_DISPLAY_PREFERENCES;
  }

  const raw = window.localStorage.getItem(FIELD_DISPLAY_PREFERENCES_STORAGE_KEY);

  if (!raw) {
    return DEFAULT_FIELD_DISPLAY_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(raw);

    return {
      showLeafFieldOnly:
        typeof parsed?.showLeafFieldOnly === "boolean"
          ? parsed.showLeafFieldOnly
          : DEFAULT_FIELD_DISPLAY_PREFERENCES.showLeafFieldOnly,
    };
  } catch {
    return DEFAULT_FIELD_DISPLAY_PREFERENCES;
  }
}

export function writeFieldDisplayPreferences(preferences: FieldDisplayPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FIELD_DISPLAY_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}
