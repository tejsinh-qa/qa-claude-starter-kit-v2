# TravelDesk test environments and data

Fictional product documentation for the demo. Not a real system.

## Environments
- `qa`: rebuilt every night from main. Data is reset at 02:00 IST.
- `staging`: release candidates only. Payment provider in sandbox mode.

## Shared test accounts
- `traveller@example.com` is a shared fixture account used by many suites.
- Do not run lockout tests against a shared account in parallel. Three workers failing at once will lock or unlock it under each other. Create a unique account per test instead.
- Real customer emails, names, or bookings must never be used as test data.

## Supported browsers
Latest two versions of Chrome, Edge, and Safari, and Firefox ESR. Mobile: Safari on iOS 17 and later, Chrome on Android 13 and later.
