import { describe, expect, it } from "vitest";
import { parseEspnCookies } from "./espn-cookies";

describe("parseEspnCookies", () => {
  it("parses a full Cookie header with unrelated cookies mixed in", () => {
    const blob =
      "Cookie: SWID={ABCD1234-5678-90AB-CDEF-1234567890AB}; espn_s2=AEB%2Fabc%3D; other=xyz";
    expect(parseEspnCookies(blob)).toEqual({
      espnS2: "AEB%2Fabc%3D",
      swid: "{ABCD1234-5678-90AB-CDEF-1234567890AB}",
    });
  });

  it("parses a document.cookie style string", () => {
    const blob =
      "foo=1; espn_s2=longvalue%2Bwith%2Fchars; SWID={11111111-2222-3333-4444-555555555555}; bar=2";
    expect(parseEspnCookies(blob)).toEqual({
      espnS2: "longvalue%2Bwith%2Fchars",
      swid: "{11111111-2222-3333-4444-555555555555}",
    });
  });

  it("keeps '=' and '%' inside the value", () => {
    const blob = "espn_s2=AABB%3D%3D=tail";
    expect(parseEspnCookies(blob)).toEqual({ espnS2: "AABB%3D%3D=tail" });
  });

  it("handles newline-separated pastes from the Application tab", () => {
    const paste = "espn_s2=AEB123\nSWID={12345678-0000-0000-0000-000000000000}";
    expect(parseEspnCookies(paste)).toEqual({
      espnS2: "AEB123",
      swid: "{12345678-0000-0000-0000-000000000000}",
    });
  });

  it("is case-insensitive on the cookie keys", () => {
    const blob = "ESPN_S2=val; swid={AAAA-BBBB-CCCC-DDDD}";
    expect(parseEspnCookies(blob)).toEqual({
      espnS2: "val",
      swid: "{AAAA-BBBB-CCCC-DDDD}",
    });
  });

  it("returns only espn_s2 when SWID is absent", () => {
    expect(parseEspnCookies("espn_s2=onlythis")).toEqual({
      espnS2: "onlythis",
    });
  });

  it("returns only SWID when espn_s2 is absent", () => {
    expect(parseEspnCookies("SWID={99999999-8888-7777-6666-555555555555}")).toEqual({
      swid: "{99999999-8888-7777-6666-555555555555}",
    });
  });

  it("recognizes a bare brace-wrapped SWID with no key", () => {
    expect(parseEspnCookies("{12345678-90AB-CDEF-1234-567890ABCDEF}")).toEqual({
      swid: "{12345678-90AB-CDEF-1234-567890ABCDEF}",
    });
  });

  it("returns undefined for junk", () => {
    expect(parseEspnCookies("hello world; nothing here")).toBeUndefined();
    expect(parseEspnCookies("")).toBeUndefined();
    expect(parseEspnCookies("   ")).toBeUndefined();
  });
});
