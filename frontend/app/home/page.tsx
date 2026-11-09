"use client";

import ZimmerCanvas from "../../components/ZimmerCanvas";
import defaultHomepagePreset from "../../lib/defaultHomepagePreset.json";
import type { ZimmerDraft } from "../../lib/zimmerTypes";

export default function HomePage() {
  return (
    <ZimmerCanvas
      pageName="Homepage"
      initialRoom={defaultHomepagePreset.room as ZimmerDraft}
      showNavigation={true}
    />
  );
}