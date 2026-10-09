# TravelDesk sign-in

Fictional product documentation for the demo. Not a real system.

## Who can sign in
Any registered traveller with a verified email address. Unverified accounts see "Check your inbox to verify your email" and cannot sign in.

## Email matching
Email is matched case-insensitively and leading or trailing spaces are trimmed. `Traveller@Example.com ` and `traveller@example.com` are the same account.

## Error messages
- Missing email or password: "Email and password are required."
- Badly formatted email: "Enter a valid email address." This is checked in the browser before any request is sent.
- Wrong email or password: "Incorrect email or password." The message never says which field was wrong.

## Lockout
- After 3 consecutive failed attempts the account is locked for 15 minutes.
- While locked, the Sign in button is disabled and the page shows "Your account is temporarily locked. Try again in 15 minutes."
- A successful sign-in resets the failed-attempt counter to zero.
- The lock is tied to the account, not to the browser. Reloading the page does not clear it.
- Support agents can unlock an account early from the Support console. Travellers cannot unlock it themselves.

## Session
A session lasts 8 hours of inactivity. Signing in on a new device does not sign out other devices.
