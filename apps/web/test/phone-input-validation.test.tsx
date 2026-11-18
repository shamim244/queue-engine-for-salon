import { describe, it, expect, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { PhoneInput, DEFAULT_COUNTRIES } from "../components/ui/phone-input";
import { validateOnboardingForm } from "../lib/onboarding";

describe("PhoneInput Component & Real-Time Input Validation", () => {
  it("renders PhoneInput cleanly with default country code +91 and 10-digit placeholder", () => {
    const raw = renderToString(
      <PhoneInput
        value=""
        onChange={() => {}}
        countryCode="+91"
        placeholder="9876543210"
        showDigitCounter={true}
      />
    );
    const html = raw.replace(/<!--.*?-->/g, "");

    expect(html).toContain("+91");
    expect(html).toContain("9876543210");
    expect(html).toContain("National mobile number (10 digits)");
    expect(html).toContain("0/10");
    expect(html).toContain('maxLength="10"');
  });

  it("renders live progress feedback and prevents more than 10 digits in render output", () => {
    // Overlength string simulating paste of 24 digits
    const overlengthValue = "777777777777777777777777";
    const raw = renderToString(
      <PhoneInput
        value={overlengthValue}
        onChange={() => {}}
        countryCode="+91"
        showDigitCounter={true}
      />
    );
    const html = raw.replace(/<!--.*?-->/g, "");

    // Value should be clamped to exactly 10 digits in the input element
    expect(html).toContain('value="7777777777"');
    // Digit counter should show 10/10 ✓
    expect(html).toContain("10/10 ✓");
    expect(html).toContain("Valid 10-digit number");
  });

  it("renders warning when digits are between 1 and 9", () => {
    const raw = renderToString(
      <PhoneInput
        value="98765"
        onChange={() => {}}
        countryCode="+91"
        showDigitCounter={true}
      />
    );
    const html = raw.replace(/<!--.*?-->/g, "");

    expect(html).toContain('value="98765"');
    expect(html).toContain("5/10 digits");
    expect(html).toContain("5 more digits required");
  });

  it("highlights invalid Indian starting digits (starts with 0-5 in +91)", () => {
    const html = renderToString(
      <PhoneInput
        value="12345"
        onChange={() => {}}
        countryCode="+91"
        showDigitCounter={true}
      />
    );

    expect(html).toContain("Starts with 6, 7, 8, or 9 in India");
  });

  it("renders all supported country codes in the dropdown", () => {
    const html = renderToString(
      <PhoneInput
        value=""
        onChange={() => {}}
        countryCode="+1"
      />
    );

    expect(html).toContain("+1");
    expect(html).toContain("+91");
    expect(html).toContain("+44");
    expect(html).toContain("+971");
    expect(html).toContain("+65");
    expect(html).toContain("+61");
  });

  it("validates form level phone requirements strictly in validateOnboardingForm", () => {
    // Valid 10 digits
    const valid = validateOnboardingForm({
      name: "Test Salon",
      slug: "test-salon",
      phone: "+91 9876543210",
      ownerUser: {
        username: "testowner",
        password: "password123",
        fullName: "Test Owner",
        phone: "+91 9876543210",
      },
      stylists: [{ name: "Barber", avgDurationMinutes: 20 }],
      services: [{ name: "Cut", basePrice: 100, estimatedDurationMinutes: 20, isAddOn: false }],
    } as any);
    expect(valid.isValid).toBe(true);
    expect(valid.errors.phone).toBeUndefined();

    // Invalid: less than 10 digits
    const shortPhone = validateOnboardingForm({
      name: "Test Salon",
      slug: "test-salon",
      phone: "+91 98765",
      ownerUser: {
        username: "testowner",
        password: "password123",
        fullName: "Test Owner",
      },
      stylists: [{ name: "Barber", avgDurationMinutes: 20 }],
      services: [{ name: "Cut", basePrice: 100, estimatedDurationMinutes: 20, isAddOn: false }],
    } as any);
    expect(shortPhone.isValid).toBe(false);
    expect(shortPhone.errors.phone).toContain("exact 10-digit");

    // Invalid: overlength phone string (e.g. +91 777777777777777777777777)
    const longPhone = validateOnboardingForm({
      name: "Test Salon",
      slug: "test-salon",
      phone: "+91 777777777777777777777777",
      ownerUser: {
        username: "testowner",
        password: "password123",
        fullName: "Test Owner",
      },
      stylists: [{ name: "Barber", avgDurationMinutes: 20 }],
      services: [{ name: "Cut", basePrice: 100, estimatedDurationMinutes: 20, isAddOn: false }],
    } as any);
    expect(longPhone.isValid).toBe(false);
    expect(longPhone.errors.phone).toContain("exact 10-digit");
  });
});
