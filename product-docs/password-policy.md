# TravelDesk password policy

Fictional product documentation for the demo. Not a real system.

## Rules for a new password
- At least 12 characters.
- Not one of the last 5 passwords used on the account.
- Not the same as the email address.
- No forced mix of character types. Length matters more.

## Password reset
- "Forgot password" sends a reset link to the account email.
- The link is valid for 30 minutes and works once.
- Resetting the password also clears any active lockout.
- The reset page never confirms whether an email is registered. It always says "If that email is registered, a link is on its way."

## Storage
Passwords are stored as salted hashes. Support agents cannot see or recover a password.
