# TravelDesk release notes, October 2026

Fictional product documentation for the demo. Not a real system.

## 2026.10.2 (planned)
- Fix: the failed-attempt counter is reset after a successful sign-in again. See known issue in 2026.10.1.

## 2026.10.1
- Change: the sign-in attempt counter was refactored into a shared helper (commit f01a7c3). No behaviour change was intended.
- Known issue: after the refactor, a successful sign-in does not reset the failed-attempt counter. A traveller who failed once and then signed in can be locked out by a single later mistake. This breaks the documented lockout rule.

## 2026.09.3
- Change: the welcome message now shows the traveller's first name instead of their email.
- Change: the Sign in button shows a spinner while the request is in flight.
