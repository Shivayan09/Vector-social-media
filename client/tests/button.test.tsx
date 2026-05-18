import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { Button } from "../components/ui/button";

describe("Button", () => {
  it("renders button text", () => {
    const html = renderToStaticMarkup(<Button>Publish</Button>);

    expect(html).toContain("Publish");
    expect(html).toContain('data-slot="button"');
  });

  it("applies variant and size attributes", () => {
    const html = renderToStaticMarkup(
      <Button variant="secondary" size="lg">
        Save
      </Button>
    );

    expect(html).toContain('data-variant="secondary"');
    expect(html).toContain('data-size="lg"');
  });

  it("merges custom classes with component styles", () => {
    const html = renderToStaticMarkup(
      <Button className="w-full">Continue</Button>
    );

    expect(html).toContain("w-full");
  });
});
