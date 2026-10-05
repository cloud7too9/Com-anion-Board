import { apiUrl, wsUrl } from "@/features/karten/lib/api";

describe("API-Adresse (Umbau Phase 2)", () => {
  it("ohne VITE_API_URL bleibt alles beim eigenen Ursprung", () => {
    expect(apiUrl("/api/server", {}, "")).toBe("/api/server");
    expect(apiUrl("/api/widgets/karte.gesamtkarte", { anzeige: "a_1", schluessel: "x y" }, "")).toBe("/api/widgets/karte.gesamtkarte?anzeige=a_1&schluessel=x+y");
    expect(wsUrl({ rolle: "anzeige" }, "")).toBe(`ws://${location.host}/ws?rolle=anzeige`);
  });

  it("mit API-Adresse gehen fetch und WebSocket dorthin, https wird zu wss", () => {
    expect(apiUrl("/api/server", {}, "https://api.beispiel.de")).toBe("https://api.beispiel.de/api/server");
    expect(wsUrl({ token: "t" }, "https://api.beispiel.de")).toBe("wss://api.beispiel.de/ws?token=t");
    expect(wsUrl({}, "http://192.168.1.5:3000")).toBe("ws://192.168.1.5:3000/ws");
  });
});
