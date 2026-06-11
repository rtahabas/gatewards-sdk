import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { getServices, getPlans, subscribe, getCredits } from "../discovery";

vi.mock("axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const mockedGet = vi.mocked(axios.get);
const mockedPost = vi.mocked(axios.post);

const GATEWAY = "https://gateway.example.com";
const API_KEY = "ag_testapikey123456789abcdef";

beforeEach(() => {
  mockedGet.mockReset().mockResolvedValue({ data: {} });
  mockedPost.mockReset().mockResolvedValue({ data: {} });
});

describe("discovery — options-object form (preferred)", () => {
  it("getServices({ gatewayUrl, search }) hits the services endpoint with the search param", async () => {
    await getServices({ gatewayUrl: GATEWAY, search: "weather api" });
    expect(mockedGet).toHaveBeenCalledWith(
      `${GATEWAY}/api/v1/services?search=weather%20api`,
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it("getPlans({ gatewayUrl, serviceId }) hits the plans endpoint", async () => {
    await getPlans({ gatewayUrl: GATEWAY, serviceId: "svc-1" });
    expect(mockedGet).toHaveBeenCalledWith(
      `${GATEWAY}/api/v1/plans?serviceId=svc-1`,
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it("subscribe({ gatewayUrl, apiKey, planId }) posts with the api key header", async () => {
    await subscribe({ gatewayUrl: GATEWAY, apiKey: API_KEY, planId: "plan-1" });
    expect(mockedPost).toHaveBeenCalledWith(
      `${GATEWAY}/api/v1/subscriptions/purchase`,
      { planId: "plan-1" },
      expect.objectContaining({ headers: { "x-api-key": API_KEY } }),
    );
  });

  it("getCredits({ gatewayUrl, apiKey }) sends the api key header", async () => {
    await getCredits({ gatewayUrl: GATEWAY, apiKey: API_KEY });
    expect(mockedGet).toHaveBeenCalledWith(
      `${GATEWAY}/api/v1/subscriptions/me`,
      expect.objectContaining({ headers: { "x-api-key": API_KEY } }),
    );
  });
});

describe("discovery — positional form (backward compatibility)", () => {
  it("getServices(gatewayUrl, search) behaves identically to the options form", async () => {
    await getServices(GATEWAY, "weather api");
    expect(mockedGet).toHaveBeenCalledWith(
      `${GATEWAY}/api/v1/services?search=weather%20api`,
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it("getPlans(gatewayUrl, serviceId) behaves identically", async () => {
    await getPlans(GATEWAY, "svc-1");
    expect(mockedGet).toHaveBeenCalledWith(
      `${GATEWAY}/api/v1/plans?serviceId=svc-1`,
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it("subscribe(gatewayUrl, apiKey, planId) behaves identically", async () => {
    await subscribe(GATEWAY, API_KEY, "plan-1");
    expect(mockedPost).toHaveBeenCalledWith(
      `${GATEWAY}/api/v1/subscriptions/purchase`,
      { planId: "plan-1" },
      expect.objectContaining({ headers: { "x-api-key": API_KEY } }),
    );
  });

  it("getCredits(gatewayUrl, apiKey) behaves identically", async () => {
    await getCredits(GATEWAY, API_KEY);
    expect(mockedGet).toHaveBeenCalledWith(
      `${GATEWAY}/api/v1/subscriptions/me`,
      expect.objectContaining({ headers: { "x-api-key": API_KEY } }),
    );
  });
});
