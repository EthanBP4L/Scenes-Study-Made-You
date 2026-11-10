
"use client";

import RequireAuth from "../../components/RequireAuth";
import ZimmerCanvas from "../../components/ZimmerCanvas";
import defaultHomepagePreset from "../../lib/defaultHomepagePreset.json";
import type { ZimmerDraft } from "../../lib/zimmerTypes";

export default function HomePage() {
  return (
    <RequireAuth>
      <ZimmerCanvas
        pageName="Homepage"
        initialRoom={defaultHomepagePreset.room as ZimmerDraft}
        showNavigation={true}
      />
    </RequireAuth>
  );
}
