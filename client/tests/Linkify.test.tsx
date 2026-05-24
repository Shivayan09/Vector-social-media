import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import Linkify from "../components/ui/Linkify";

describe("Linkify", () => {
    it("renders normal text without links", () => {
        const html = renderToStaticMarkup(<Linkify text="Hello world" />);
        expect(html).toBe("Hello world");
    });

    it("renders valid URL as anchor tag", () => {
        const html = renderToStaticMarkup(<Linkify text="Check https://example.com" />);
        expect(html).toContain('href="https://example.com"');
        expect(html).toContain(">https://example.com</a>");
        expect(html).toContain("Check ");
    });

    it("trims trailing punctuation and renders it outside anchor tag", () => {
        const html = renderToStaticMarkup(<Linkify text="Look at https://example.com/page.)" />);
        expect(html).toContain('href="https://example.com/page"');
        expect(html).toContain(">https://example.com/page</a>.)");
    });

    it("renders invalid scheme as plain text", () => {
        const html = renderToStaticMarkup(<Linkify text="Not allowed: javascript://alert(1)" />);
        // The regex `/(https?:\/\/[^\s]+)/g` doesn't match javascript:// anyway, but it's a good test case
        expect(html).toContain("Not allowed: javascript://alert(1)");
        expect(html).not.toContain("<a");
    });

    it("renders valid HTTP URL", () => {
        const html = renderToStaticMarkup(<Linkify text="http://insecure.com" />);
        expect(html).toContain('href="http://insecure.com"');
    });

    it("handles multiple links and punctuation", () => {
        const html = renderToStaticMarkup(<Linkify text="Links: https://a.com, and https://b.com/.)" />);
        expect(html).toContain('href="https://a.com"');
        expect(html).toContain(">https://a.com</a>, and ");
        expect(html).toContain('href="https://b.com/"');
        expect(html).toContain(">https://b.com/</a>.)");
    });
});
