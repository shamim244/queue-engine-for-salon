import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";

// Dynamic import target: will fail until components/ui/container-scroll-animation.tsx is implemented
describe("ContainerScroll 2.5D Primitive Suite (TDD)", () => {
  it("should render ContainerScroll, Header, and Card with 3D perspective styling without crashing", async () => {
    const { ContainerScroll } = await import("../components/ui/container-scroll-animation");

    const html = renderToString(
      <ContainerScroll
        titleComponent={<h1 className="text-white">Salon Cutting Desk</h1>}
      >
        <div data-testid="salon-tablet">Tablet Content</div>
      </ContainerScroll>
    );

    // Verify perspective structure and styling
    expect(html).toContain("Salon Cutting Desk");
    expect(html).toContain("Tablet Content");
    expect(html).toContain("perspective");
  });
});
