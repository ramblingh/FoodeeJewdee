# Security Specification & Threat Model for Foodie Jewdie

## Data Invariants
1. **Public Read Access**: Approved restaurants are readable by all visitors (unauthenticated and authenticated).
2. **Public Suggestion Submissions**: Any visitor can submit new location suggestions (`/suggestions`) or edit requests (`/editSuggestions`) with `status: 'pending'`.
3. **Admin Privilege Guard**: Only UIDs present in `/admins/{userId}` or matching the bootstrapped administrator email (`16thdoctor@gmail.com`) can approve, edit, or delete restaurants, manage suggestions, or grant admin privileges.
4. **No Self-Promoted Admins**: Public users cannot create documents in `/admins` or grant themselves `role: 'admin'`.
5. **Data Validation & Sanitization**: Incoming documents must meet schema types, string length boundaries, and strict field constraints.

## Dirty Dozen Attack Payloads
1. **Privilege Escalation**: Attempting to write `{ "uid": "attacker", "email": "attacker@evil.com", "role": "admin" }` to `/admins/attacker`. (REJECTED by rules)
2. **Direct Restaurant Injection**: Unauthenticated user trying to `setDoc` on `/restaurants/malicious`. (REJECTED)
3. **Status Poisoning**: Public user creating a suggestion directly with `status: 'approved'`. (REJECTED - status must be 'pending' for non-admins)
4. **Overly Long Input**: Sending 100KB string in `name` to exhaust storage. (REJECTED by `maxLength` checks)
5. **Deleting Restaurant**: Non-admin attempting to delete `/restaurants/loc-1`. (REJECTED)
6. **Modifying Existing Restaurant**: Non-admin calling `updateDoc` on `/restaurants/loc-1`. (REJECTED)
7. **Tampering with Admins List**: Authenticated non-admin trying to edit `/admins/someAdmin`. (REJECTED)
8. **Dismissing Suggestions**: Non-admin setting `status: 'rejected'` or `status: 'dismissed'` on suggestions. (REJECTED)
9. **Ghost Fields**: Attempting to add arbitrary fields like `{ "isVerified": true }` to `/restaurants`. (REJECTED)
10. **ID Injection Attack**: Using invalid characters like `/restaurants/../../../etc`. (REJECTED by `isValidId`)
11. **User Profile Spoofing**: User `uid1` attempting to overwrite `/users/uid2`. (REJECTED)
12. **PII Exposure**: Non-owner/non-admin attempting to read private user profiles. (REJECTED)
