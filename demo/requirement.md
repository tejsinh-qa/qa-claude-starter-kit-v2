# User Story — TD-142: Traveller sign-in

**As a** registered traveller
**I want to** sign in with my email and password
**So that** I can view and manage my bookings

## Acceptance criteria
1. A traveller with a valid email and password is signed in and sees a welcome message.
2. Email and password are both required; a clear error is shown if either is missing.
3. An invalidly formatted email shows a validation error before any credential check.
4. Incorrect credentials show a generic error that does not reveal which field was wrong.
5. After 3 consecutive failed attempts, the account is temporarily locked and the Sign in button is disabled.
6. Email matching is case-insensitive.

## Notes
- The page under test is `demo/app/login.html`.
- Demo credentials for automation are documented in that file (fixture data only).
